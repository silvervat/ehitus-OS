
import React, { useState, useEffect, useRef } from 'react';
import { Comment } from '../types';
import { Send, User, MessageSquare, Reply, Paperclip, Smile, MoreHorizontal, X, ThumbsUp, Heart, AlertCircle } from 'lucide-react';
import { MOCK_USERS } from '../constants';

interface CommentThreadProps {
    tableId: string;
    rowId: string;
    onClose?: () => void;
}

interface ReactionProps {
    emoji: string;
    count: number;
    active: boolean;
    onClick: () => void;
}

const ReactionBadge: React.FC<ReactionProps> = ({ emoji, count, active, onClick }) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border transition-colors ${active ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
    >
        <span>{emoji}</span>
        <span className="font-medium">{count}</span>
    </button>
);

const CommentItem: React.FC<{ comment: Comment, onReply: (id: string, name: string) => void }> = ({ comment, onReply }) => {
    return (
        <div className="flex gap-3 group">
             <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm border-2 border-white ring-1 ring-slate-100">
                {comment.authorName.charAt(0)}
             </div>
             <div className="flex-1 space-y-1">
                 <div className="flex justify-between items-baseline">
                     <span className="text-sm font-bold text-slate-700">{comment.authorName}</span>
                     <span className="text-[10px] text-slate-400">{new Date(comment.createdAt).toLocaleString('et-EE', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' })}</span>
                 </div>
                 
                 <div className="text-sm text-slate-700 bg-white p-3 rounded-lg rounded-tl-none border border-slate-200 shadow-sm leading-relaxed">
                     {/* Render mentions specially */}
                     {comment.content.split(' ').map((word, i) => 
                        word.startsWith('@') ? <span key={i} className="text-blue-600 font-medium bg-blue-50 px-1 rounded">{word} </span> : word + ' '
                     )}
                 </div>

                 <div className="flex items-center gap-3 pt-1">
                     <div className="flex gap-1">
                        {Object.entries(comment.reactions || {}).map(([emoji, users]) => (
                            <ReactionBadge key={emoji} emoji={emoji} count={(users as string[]).length} active={false} onClick={() => {}} />
                        ))}
                     </div>
                     
                     <div className="flex gap-3 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                         <button className="hover:text-blue-600 flex items-center gap-1 transition-colors" onClick={() => onReply(comment.id, comment.authorName)}>
                            <Reply size={12}/> Vasta
                         </button>
                         <button className="hover:text-yellow-600 transition-colors"><Smile size={12}/></button>
                     </div>
                 </div>

                 {/* Replies */}
                 {comment.replies && comment.replies.length > 0 && (
                     <div className="mt-3 pl-3 border-l-2 border-slate-100 space-y-3">
                         {comment.replies.map(reply => (
                             <CommentItem key={reply.id} comment={reply} onReply={onReply} />
                         ))}
                     </div>
                 )}
             </div>
        </div>
    );
};

export const CommentThread: React.FC<CommentThreadProps> = ({ tableId, rowId, onClose }) => {
    const [comments, setComments] = useState<Comment[]>([
        {
            id: 'c1',
            tableId,
            rowId,
            authorId: 'u2',
            authorName: 'Elvis Juus',
            content: 'Kas selle eelarve on kinnitatud? @Kristofer',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            reactions: { '👍': ['u1'] },
            replies: [
                {
                    id: 'c1_r1',
                    tableId,
                    rowId,
                    authorId: 'u1',
                    authorName: 'Kristofer Nilp',
                    content: 'Jah, eile kinnitasime juhatuses.',
                    createdAt: new Date(Date.now() - 43200000).toISOString(),
                    replies: []
                }
            ]
        }
    ]);
    const [newComment, setNewComment] = useState('');
    const [replyTo, setReplyTo] = useState<{ id: string, name: string } | null>(null);
    const [showMentions, setShowMentions] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSubmit = () => {
        if (!newComment.trim()) return;

        const comment: Comment = {
            id: `c_${Date.now()}`,
            tableId,
            rowId,
            authorId: 'u1', // Mock current user
            authorName: 'Kristofer Nilp',
            content: newComment,
            createdAt: new Date().toISOString(),
            replies: []
        };

        if (replyTo) {
            setComments(prev => prev.map(c => {
                if (c.id === replyTo.id) {
                    return { ...c, replies: [...(c.replies || []), comment] };
                }
                return c;
            }));
            setReplyTo(null);
        } else {
            setComments([...comments, comment]);
        }
        
        setNewComment('');
        setShowMentions(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setNewComment(val);
        
        // Simple mention trigger logic
        const lastWord = val.split(' ').pop();
        if (lastWord && lastWord.startsWith('@') && lastWord.length > 1) {
            setShowMentions(true);
        } else {
            setShowMentions(false);
        }
    };

    const insertMention = (userName: string) => {
        const words = newComment.split(' ');
        words.pop(); // Remove the partial @mention
        setNewComment([...words, `@${userName} `].join(' '));
        setShowMentions(false);
        textareaRef.current?.focus();
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 w-full relative">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm flex-shrink-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                        <MessageSquare size={18} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">Arutelu</h3>
                        <p className="text-[10px] text-slate-500">Rida ID: <span className="font-mono">{rowId}</span></p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                     <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">{comments.length + comments.reduce((acc, c) => acc + (c.replies?.length || 0), 0)} sõnumit</span>
                     {onClose && (
                        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600">
                            <X size={18} />
                        </button>
                     )}
                </div>
            </div>
            
            {/* Thread List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar bg-slate-50">
                {comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                        <MessageSquare size={48} className="mb-2" strokeWidth={1} />
                        <p className="text-sm">Siin pole veel kommentaare.</p>
                        <p className="text-xs">Alusta vestlust!</p>
                    </div>
                ) : (
                    comments.map(comment => (
                        <CommentItem 
                            key={comment.id} 
                            comment={comment} 
                            onReply={(id, name) => {
                                setReplyTo({ id, name });
                                textareaRef.current?.focus();
                            }} 
                        />
                    ))
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-200 bg-white flex-shrink-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                {replyTo && (
                    <div className="flex justify-between items-center mb-2 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100">
                        <span className="flex items-center gap-1"><Reply size={12}/> Vastad kasutajale <b>{replyTo.name}</b></span>
                        <button onClick={() => setReplyTo(null)}><X size={14}/></button>
                    </div>
                )}
                
                <div className="relative">
                    {/* Mentions Popup */}
                    {showMentions && (
                        <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-2 z-50">
                            <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">Maini kedagi</div>
                            {MOCK_USERS.map(user => (
                                <button 
                                    key={user.id}
                                    onClick={() => insertMention(user.name)}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                >
                                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">{user.avatarUrl}</div>
                                    {user.name}
                                </button>
                            ))}
                        </div>
                    )}

                    <textarea
                        ref={textareaRef}
                        value={newComment}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        placeholder={replyTo ? "Kirjuta vastus..." : "Lisa kommentaar... (@mainimiseks)"}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none transition-shadow"
                        rows={replyTo ? 2 : 1}
                        style={{ minHeight: '44px' }}
                    />
                    
                    <div className="flex justify-between items-center mt-2">
                        <div className="flex gap-1">
                            <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100" title="Lisa fail">
                                <Paperclip size={16} />
                            </button>
                            <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100" title="Lisa emoji">
                                <Smile size={16} />
                            </button>
                        </div>
                        <button 
                            onClick={handleSubmit} 
                            disabled={!newComment.trim()}
                            className="bg-teal-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-teal-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                        >
                            <span>Saada</span> <Send size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
