'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Mail, Clock, ChevronLeft, ChevronRight, Eye, Search, Filter, Send, AlertTriangle } from 'lucide-react';

const mockMessages = [
  { id: 1, from: 'Ahmed Benali', subject: 'Question sur le module 3', preview: 'Bonjour, j\'ai une question concernant les ressources Azure...', createdAt: '2026-03-21T10:30:00', isRead: false },
  { id: 2, from: 'Fatima Zahra', subject: 'Demande de certification', preview: 'J\'ai terminé tous les modules, comment obtenir ma certification?', createdAt: '2026-03-21T09:15:00', isRead: false },
  { id: 3, from: 'Karim Hamdani', subject: 'Problème avec un exercice', preview: 'Je n\'arrive pas à accéder au lab pratique...', createdAt: '2026-03-21T08:45:00', isRead: true },
  { id: 4, from: 'Youssef Alaoui', subject: 'Feedback sur le cours', preview: 'Le cours AZ-900 est très bien expliqué, merci!', createdAt: '2026-03-20T16:20:00', isRead: true },
  { id: 5, from: 'Sara Idrissi', subject: 'Suivi de progression', preview: 'Je voudrais discuter de mon plan de formation...', createdAt: '2026-03-20T14:00:00', isRead: true },
  { id: 6, from: 'Omar Benjelloun', subject: 'Questions sur AWS EC2', preview: 'Quelle est la différence entre les instances T2 et T3?', createdAt: '2026-03-19T11:30:00', isRead: true },
];

const ITEMS_PER_PAGE = 5;

export default function InstructorMessagesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRead, setFilterRead] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMessage, setSelectedMessage] = useState<typeof mockMessages[0] | null>(null);

  const filteredMessages = mockMessages.filter(message => {
    const matchesSearch = 
      message.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.preview.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRead = 
      filterRead === 'all' ||
      (filterRead === 'read' && message.isRead) ||
      (filterRead === 'unread' && !message.isRead);
    return matchesSearch && matchesRead;
  });

  const totalPages = Math.ceil(filteredMessages.length / ITEMS_PER_PAGE);
  const paginatedMessages = filteredMessages.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const unreadCount = mockMessages.filter(m => !m.isRead).length;

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Aujourd\'hui';
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen bg-muted/30 text-foreground w-full space-y-6 p-1">
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-800">Module Instructeur - Bientôt disponible</p>
          <p className="text-xs text-amber-600">Les données affichées sont des exemples de démonstration.</p>
        </div>
      </div>

      <motion.div
        className="bg-card rounded-2xl p-8 border border-border shadow-md"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-slate-500 text-sm mb-1">Messagerie</p>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-primary" />
              Messages
              {unreadCount > 0 && (
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-500/10 text-red-600">
                  {unreadCount} non lus
                </span>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher un message..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 pr-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-64"
              />
            </div>
            <select
              value={filterRead}
              onChange={(e) => {
                setFilterRead(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">Tous</option>
              <option value="unread">Non lus</option>
              <option value="read">Lus</option>
            </select>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">De</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sujet</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMessages.map((message, index) => (
                  <motion.tr
                    key={message.id}
                    className={`border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer ${
                      selectedMessage?.id === message.id ? 'bg-primary/5' : ''
                    }`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedMessage(message)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm ${
                          message.isRead ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'
                        }`}>
                          {message.from.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className={`font-medium ${message.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {message.from}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className={`text-sm ${message.isRead ? 'text-muted-foreground' : 'font-medium text-foreground'}`}>
                        {message.subject}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-xs">{message.preview}</p>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(message.createdAt)}
                    </td>
                    <td className="p-4">
                      {message.isRead ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-muted/50 text-muted-foreground">
                          Lu
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                          Nouveau
                        </span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Mail className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun message trouvé.</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Affichage {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredMessages.length)} sur {filteredMessages.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border hover:bg-muted'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {selectedMessage ? (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <button 
                  onClick={() => setSelectedMessage(null)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-muted-foreground">
                  {formatDate(selectedMessage.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center font-semibold bg-primary text-primary-foreground">
                  {selectedMessage.from.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{selectedMessage.from}</p>
                </div>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-4">{selectedMessage.subject}</h3>
              <p className="text-muted-foreground mb-6">{selectedMessage.preview}</p>
              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors">
                  <Send className="w-4 h-4" />
                  Répondre
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Sélectionnez un message pour le lire</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
