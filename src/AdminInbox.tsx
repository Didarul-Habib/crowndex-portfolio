import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  Archive,
  ArrowLeft,
  Check,
  ChevronRight,
  Clock3,
  Inbox as InboxIcon,
  Mail,
  MailOpen,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Undo2,
} from 'lucide-react';
import { backend } from './lib/content';

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  project_type: string;
  message: string;
  created_at: string;
  read_at: string | null;
  archived_at: string | null;
};

type InboxView = 'inbox' | 'unread' | 'archived';

type AdminInboxProps = {
  onUnreadChange: (count: number) => void;
};

function formatReceived(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function relativeReceived(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const elapsed = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export default function AdminInbox({ onUnreadChange }: AdminInboxProps) {
  const [view, setView] = useState<InboxView>('inbox');
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadMessages = useCallback(async (quiet = false) => {
    if (!backend) return;
    if (!quiet) setLoading(true);

    let listQuery = backend
      .from('contact_messages')
      .select('id,name,email,project_type,message,created_at,read_at,archived_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (view === 'unread') {
      listQuery = listQuery.is('archived_at', null).is('read_at', null);
    } else if (view === 'archived') {
      listQuery = listQuery.not('archived_at', 'is', null);
    } else {
      listQuery = listQuery.is('archived_at', null);
    }

    const [listResult, countResult] = await Promise.all([
      listQuery,
      backend
        .from('contact_messages')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null)
        .is('archived_at', null),
    ]);

    if (countResult.error) {
      onUnreadChange(0);
    } else {
      onUnreadChange(countResult.count ?? 0);
    }

    if (listResult.error) {
      setMessages([]);
      setSelectedId(null);
      setError(
        listResult.error.message.toLowerCase().includes('contact_messages')
          ? 'The Inbox database migration has not been applied yet. Follow the setup guide included with this release.'
          : `Unable to load messages: ${listResult.error.message}`,
      );
    } else {
      const rows = (listResult.data ?? []) as ContactMessage[];
      setMessages(rows);
      setError('');
      setSelectedId((current) => (
        current && rows.some((message) => message.id === current)
          ? current
          : rows[0]?.id ?? null
      ));
    }

    if (!quiet) setLoading(false);
  }, [onUnreadChange, view]);

  useEffect(() => {
    void loadMessages();
    const client = backend;
    if (!client) return;

    const channel = client
      .channel('crowndex-contact-inbox')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contact_messages' },
        () => { void loadMessages(true); },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [loadMessages]);

  const filteredMessages = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return messages;
    return messages.filter((message) => [
      message.name,
      message.email,
      message.project_type,
      message.message,
    ].some((value) => value.toLowerCase().includes(term)));
  }, [messages, search]);

  const selectedMessage = messages.find((message) => message.id === selectedId) ?? null;
  const unreadInList = messages.filter((message) => !message.read_at && !message.archived_at).length;

  async function updateMessage(
    message: ContactMessage,
    patch: { read_at?: string | null; archived_at?: string | null },
    success: string,
  ) {
    if (!backend) return;
    setWorking(true);
    setNotice('');
    const { error: updateError } = await backend
      .from('contact_messages')
      .update(patch)
      .eq('id', message.id);
    setWorking(false);
    if (updateError) {
      setNotice(`Update failed: ${updateError.message}`);
      return;
    }
    setNotice(success);
    await loadMessages(true);
  }

  async function deleteMessage(message: ContactMessage) {
    if (!backend || !window.confirm(`Permanently delete the message from ${message.name}?`)) return;
    setWorking(true);
    const { error: deleteError } = await backend
      .from('contact_messages')
      .delete()
      .eq('id', message.id);
    setWorking(false);
    if (deleteError) {
      setNotice(`Delete failed: ${deleteError.message}`);
      return;
    }
    setSelectedId(null);
    setNotice('Message permanently deleted.');
    await loadMessages(true);
  }

  const viewLabels: Array<{ key: InboxView; label: string }> = [
    { key: 'inbox', label: 'All messages' },
    { key: 'unread', label: 'Unread' },
    { key: 'archived', label: 'Archived' },
  ];

  return (
    <section className="admin-inbox">
      <div className="admin-inbox-intro">
        <div className="admin-inbox-intro-icon"><InboxIcon size={22} /></div>
        <div>
          <span className="admin-eyebrow">PRIVATE MESSAGE CENTRE</span>
          <h2>Your conversations, in one place.</h2>
          <p>Messages submitted through the public CrownDEX contact form appear here. New submissions sync while this studio is open.</p>
        </div>
        <button className="admin-inbox-refresh" type="button" onClick={() => void loadMessages()} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'admin-spinner' : ''} /> Refresh
        </button>
      </div>

      {notice && <div className="admin-inbox-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}

      {error ? (
        <div className="admin-inbox-setup">
          <ShieldCheck size={28} />
          <h3>Inbox setup required</h3>
          <p>{error}</p>
          <small>The existing portfolio, login and content tools are unaffected.</small>
        </div>
      ) : (
        <div className={`admin-inbox-layout ${selectedMessage ? 'has-selection' : ''}`}>
          <section className="admin-inbox-list" aria-label="Contact messages">
            <div className="admin-inbox-list-top">
              <div>
                <strong>INCOMING</strong>
                <span>{messages.length} {messages.length === 1 ? 'message' : 'messages'} loaded</span>
              </div>
              <span className="admin-inbox-unread-total">{unreadInList} unread</span>
            </div>

            <div className="admin-inbox-filters" role="tablist" aria-label="Inbox filters">
              {viewLabels.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={view === item.key}
                  className={view === item.key ? 'is-active' : ''}
                  onClick={() => { setView(item.key); setSelectedId(null); }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <label className="admin-inbox-search">
              <Search size={16} />
              <input
                type="search"
                value={search}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
                placeholder="Search name, email or message"
                aria-label="Search inbox"
              />
            </label>

            <div className="admin-inbox-message-list">
              {loading ? (
                <div className="admin-inbox-empty"><RefreshCw size={20} className="admin-spinner" /> Loading messages…</div>
              ) : filteredMessages.length === 0 ? (
                <div className="admin-inbox-empty">
                  <MailOpen size={25} />
                  <strong>{search ? 'No matching messages' : view === 'archived' ? 'Nothing archived yet' : view === 'unread' ? 'You are all caught up' : 'Your inbox is clear'}</strong>
                  <span>{search ? 'Try another search term.' : 'Website enquiries will appear here when someone sends your contact form.'}</span>
                </div>
              ) : filteredMessages.map((message) => (
                <button
                  className={`admin-inbox-message ${selectedId === message.id ? 'is-selected' : ''} ${!message.read_at ? 'is-unread' : ''}`}
                  type="button"
                  key={message.id}
                  onClick={() => setSelectedId(message.id)}
                >
                  <span className="admin-inbox-avatar">{message.name.trim().charAt(0).toUpperCase() || '?'}</span>
                  <span className="admin-inbox-message-copy">
                    <span className="admin-inbox-message-meta">
                      <strong>{message.name}</strong>
                      <time dateTime={message.created_at}>{relativeReceived(message.created_at)}</time>
                    </span>
                    <span className="admin-inbox-subject">{message.project_type || 'Project enquiry'}</span>
                    <span className="admin-inbox-excerpt">{message.message}</span>
                  </span>
                  {!message.read_at && <i className="admin-inbox-unread-dot" aria-label="Unread" />}
                  <ChevronRight size={15} className="admin-inbox-chevron" />
                </button>
              ))}
            </div>
          </section>

          <section className="admin-inbox-detail" aria-label="Selected message">
            {selectedMessage ? (
              <>
                <div className="admin-inbox-detail-head">
                  <button className="admin-inbox-mobile-back" type="button" onClick={() => setSelectedId(null)}>
                    <ArrowLeft size={15} /> Back to messages
                  </button>
                  <div className="admin-inbox-detail-actions">
                    {selectedMessage.archived_at ? (
                      <button type="button" onClick={() => void updateMessage(selectedMessage, { archived_at: null }, 'Message restored to your inbox.')} disabled={working}>
                        <Undo2 size={15} /> Restore
                      </button>
                    ) : (
                      <button type="button" onClick={() => void updateMessage(selectedMessage, { archived_at: new Date().toISOString() }, 'Message archived.')} disabled={working}>
                        <Archive size={15} /> Archive
                      </button>
                    )}
                    <button type="button" onClick={() => void updateMessage(selectedMessage, { read_at: selectedMessage.read_at ? null : new Date().toISOString() }, selectedMessage.read_at ? 'Marked as unread.' : 'Marked as read.')} disabled={working}>
                      <Mail size={15} /> {selectedMessage.read_at ? 'Mark unread' : 'Mark read'}
                    </button>
                    <button className="is-danger" type="button" onClick={() => void deleteMessage(selectedMessage)} disabled={working}>
                      <Trash2 size={15} /> Delete
                    </button>
                  </div>
                </div>

                <div className="admin-inbox-message-detail">
                  <div className="admin-inbox-detail-kicker"><span>PROJECT ENQUIRY</span><span><Clock3 size={13} /> {formatReceived(selectedMessage.created_at)}</span></div>
                  <h3>{selectedMessage.project_type || 'New project enquiry'}</h3>
                  <div className="admin-inbox-sender">
                    <span className="admin-inbox-avatar admin-inbox-avatar-large">{selectedMessage.name.trim().charAt(0).toUpperCase() || '?'}</span>
                    <div>
                      <strong>{selectedMessage.name}</strong>
                      <a href={`mailto:${selectedMessage.email}?subject=${encodeURIComponent(`Re: ${selectedMessage.project_type || 'CrownDEX project enquiry'}`)}`}>{selectedMessage.email}</a>
                    </div>
                    {!selectedMessage.read_at && <span className="admin-inbox-status">UNREAD</span>}
                  </div>
                  <div className="admin-inbox-body">{selectedMessage.message}</div>
                  <div className="admin-inbox-reply">
                    <a
                      href={`mailto:${selectedMessage.email}?subject=${encodeURIComponent(`Re: ${selectedMessage.project_type || 'CrownDEX project enquiry'}`)}&body=${encodeURIComponent(`Hi ${selectedMessage.name},\n\nThank you for getting in touch. `)}`}
                    >
                      <Send size={16} /> Reply by email <ChevronRight size={15} />
                    </a>
                    <span>Opens your email application. No paid email service is required.</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="admin-inbox-detail-empty">
                <div><MailOpen size={29} /></div>
                <h3>Select a conversation</h3>
                <p>Choose a message from the list to read the full enquiry and reply.</p>
              </div>
            )}
          </section>
        </div>
      )}

      <div className="admin-inbox-footnote">
        <ShieldCheck size={15} />
        <span>Private to your approved admin account. Messages are stored in your Supabase database and protected by Row Level Security.</span>
        <span className="admin-inbox-secure-label"><Check size={13} /> PRIVATE</span>
      </div>
    </section>
  );
}
