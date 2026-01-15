import { useState } from 'react';
import {
  HelpCircle,
  MessageSquare,
  Phone,
  Mail,
  ChevronRight,
  Send,
  Paperclip,
  Search,
  Plus,
  X,
  ExternalLink,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { supportTickets } from '../data/placeholderData';

type TicketPriorityValue = 'low' | 'medium' | 'high';

const priorityConfig: Record<TicketPriorityValue, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700' },
  high: { label: 'High', color: 'bg-red-100 text-red-700' },
};

const categoryLabels: Record<string, string> = {
  lead_issue: 'Lead Issue',
  commission: 'Commission',
  documents: 'Documents',
  technical: 'Technical',
  other: 'Other',
};

const faqItems = [
  {
    question: 'How long does it take for a loan to get approved?',
    answer: 'Loan approval typically takes 3-7 working days depending on the bank and loan type. Personal loans are usually faster (2-3 days), while home loans may take up to 7-10 days.',
  },
  {
    question: 'When will I receive my commission?',
    answer: 'Commissions are processed twice a month - on the 1st and 15th. Your commission will be credited to your registered bank account within 2-3 working days after processing.',
  },
  {
    question: 'What documents are required for different loan types?',
    answer: 'Common documents include PAN, Aadhaar, income proof, and bank statements. Specific requirements vary by loan type. Check the Documents page for detailed checklists.',
  },
  {
    question: 'How do I update my bank account details?',
    answer: 'Go to Profile & KYC section and click on "Update Bank Details". You will need to verify the change via OTP. New account details will be used for the next payout cycle.',
  },
  {
    question: 'What if my client\'s loan application is rejected?',
    answer: 'If rejected, you can view the reason in the lead details. Common reasons include low credit score or insufficient income. You can reapply after addressing the issues.',
  },
];

export default function SupportPage() {
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<typeof supportTickets[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');

  const [newTicketForm, setNewTicketForm] = useState({
    subject: '',
    category: '',
    priority: 'medium' as TicketPriorityValue,
    description: '',
  });

  const filteredTickets = supportTickets.filter((ticket) =>
    ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmitTicket = () => {
    // Handle ticket submission
    setShowNewTicket(false);
    setNewTicketForm({
      subject: '',
      category: '',
      priority: 'medium',
      description: '',
    });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    // Handle message send
    setNewMessage('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Help & Support</h1>
          <p className="text-slate-500 mt-1">Get help with your queries and issues</p>
        </div>
        <button
          onClick={() => setShowNewTicket(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Raise New Ticket
        </button>
      </div>

      {/* Contact Options */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Phone className="text-blue-600" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Call Us</h3>
              <p className="text-sm text-slate-500 mt-1">Mon-Sat, 9AM-7PM</p>
              <a href="tel:+918001234567" className="text-blue-600 font-medium mt-2 inline-block hover:underline">
                1800-123-4567
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <MessageSquare className="text-green-600" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">WhatsApp</h3>
              <p className="text-sm text-slate-500 mt-1">Quick responses</p>
              <a href="#" className="text-green-600 font-medium mt-2 inline-flex items-center gap-1 hover:underline">
                Chat Now
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Mail className="text-purple-600" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Email</h3>
              <p className="text-sm text-slate-500 mt-1">24-48 hrs response</p>
              <a href="mailto:support@growthpath.in" className="text-purple-600 font-medium mt-2 inline-block hover:underline">
                support@growthpath.in
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Tickets */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">My Tickets</h3>
              <span className="text-sm text-slate-500">{supportTickets.length} tickets</span>
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tickets..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {filteredTickets.length > 0 ? (
              filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                    selectedTicket?.id === ticket.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-mono">{ticket.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig[ticket.priority].color}`}>
                          {priorityConfig[ticket.priority].label}
                        </span>
                      </div>
                      <h4 className="font-medium text-slate-800 mt-1 truncate">{ticket.subject}</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        {categoryLabels[ticket.category]} • {ticket.createdAt}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={ticket.status} size="sm" />
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-slate-500">No tickets found</p>
              </div>
            )}
          </div>
        </div>

        {/* Ticket Detail / FAQ */}
        {selectedTicket ? (
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">{selectedTicket.id}</span>
                  <StatusBadge status={selectedTicket.status} size="sm" />
                </div>
                <h3 className="font-semibold text-slate-800 mt-1">{selectedTicket.subject}</h3>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Ticket Timeline */}
            <div className="p-5 max-h-72 overflow-y-auto border-b border-slate-100">
              <div className="space-y-4">
                {/* Initial Message */}
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold">Y</span>
                  </div>
                  <div className="flex-1 bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-800">You</span>
                      <span className="text-xs text-slate-400">{selectedTicket.createdAt}</span>
                    </div>
                    <p className="text-sm text-slate-600">{selectedTicket.description}</p>
                  </div>
                </div>

                {/* Messages */}
                {selectedTicket.messages.map((message) => (
                  <div key={message.id} className="flex gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.sender === 'support'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      <span className="text-sm font-semibold">
                        {message.sender === 'support' ? 'S' : 'Y'}
                      </span>
                    </div>
                    <div
                      className={`flex-1 rounded-lg p-3 ${
                        message.sender === 'support' ? 'bg-green-50' : 'bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-800">
                          {message.sender === 'support' ? message.senderName : 'You'}
                        </span>
                        <span className="text-xs text-slate-400">{message.timestamp}</span>
                      </div>
                      <p className="text-sm text-slate-600">{message.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reply Input */}
            {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
              <div className="p-4">
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      rows={2}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <button className="absolute right-2 bottom-2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
                      <Paperclip size={16} />
                    </button>
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* FAQ Section */
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HelpCircle className="text-blue-600" size={20} />
                <h3 className="font-semibold text-slate-800">Frequently Asked Questions</h3>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {faqItems.map((faq, index) => (
                <div key={index}>
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-medium text-slate-800 pr-4">{faq.question}</span>
                    <ChevronRight
                      size={18}
                      className={`text-slate-400 flex-shrink-0 transition-transform ${
                        expandedFaq === index ? 'rotate-90' : ''
                      }`}
                    />
                  </button>
                  {expandedFaq === index && (
                    <div className="px-5 pb-4">
                      <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      {showNewTicket && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Raise New Ticket</h2>
              <button
                onClick={() => setShowNewTicket(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject *</label>
                <input
                  type="text"
                  value={newTicketForm.subject}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
                  placeholder="Brief description of your issue"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Category *</label>
                  <select
                    value={newTicketForm.category}
                    onChange={(e) => setNewTicketForm({ ...newTicketForm, category: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category</option>
                    <option value="lead_issue">Lead Issue</option>
                    <option value="commission">Commission</option>
                    <option value="documents">Documents</option>
                    <option value="technical">Technical</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Priority</label>
                  <select
                    value={newTicketForm.priority}
                    onChange={(e) =>
                      setNewTicketForm({ ...newTicketForm, priority: e.target.value as TicketPriorityValue })
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description *</label>
                <textarea
                  value={newTicketForm.description}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, description: e.target.value })}
                  placeholder="Provide detailed information about your issue..."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Paperclip size={16} className="text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">Attachments</span>
                </div>
                <label className="block">
                  <input type="file" multiple className="hidden" />
                  <span className="inline-flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-500 cursor-pointer hover:border-blue-400 hover:text-blue-600 transition-colors">
                    <Plus size={16} />
                    Add files (optional)
                  </span>
                </label>
                <p className="text-xs text-slate-400 mt-2">Max 5 files, 5MB each. Supports PDF, JPG, PNG</p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowNewTicket(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitTicket}
                disabled={!newTicketForm.subject || !newTicketForm.category || !newTicketForm.description}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
