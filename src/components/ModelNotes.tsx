import React, { useState } from 'react';
import { Model, Note } from '../types';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';

interface Props {
  model: Model;
  onUpdateModel: (updatedModel: Model) => Promise<void>;
  isAdmin: boolean;
  currentAdmin?: string;
}

export const ModelNotes: React.FC<Props> = ({ model, onUpdateModel, isAdmin, currentAdmin }) => {
  const [newNote, setNewNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filter out notes older than 15 days
  const validNotes = (model.notes || []).filter(note => {
    const noteDate = new Date(note.date).getTime();
    const now = new Date().getTime();
    const diffDays = (now - noteDate) / (1000 * 3600 * 24);
    return diffDays <= 15;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Auto-cleanup if there are expired notes
  const hasCleanedUp = React.useRef(false);
  React.useEffect(() => {
    if (!hasCleanedUp.current && model.notes && validNotes.length !== model.notes.length && isAdmin) {
      hasCleanedUp.current = true;
      onUpdateModel({ ...model, notes: validNotes });
    }
  }, [model.notes, validNotes.length, isAdmin]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setIsSaving(true);
    try {
      const note: Note = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text: newNote.trim(),
        date: new Date().toISOString(),
        author: currentAdmin || 'Admin'
      };

      const updatedNotes = [note, ...validNotes];
      await onUpdateModel({ ...model, notes: updatedNotes });
      
      // Send email notification
      if (model.email) {
        fetch('/api/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: model.email,
            subject: `New Note Added`,
            text: `A new note has been added to your profile by ${note.author}.\n\nNote:\n${note.text}\n\nPlease check your cabinet for more details.`,
            html: `<p>A new note has been added to your profile by <strong>${note.author}</strong>.</p><blockquote>${note.text.replace(/\n/g, '<br/>')}</blockquote><p>Please check your cabinet for more details.</p>`
          })
        }).catch(err => console.error('Failed to send note notification:', err));
      }

      setNewNote('');
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const updatedNotes = validNotes.filter(n => n.id !== noteId);
      await onUpdateModel({ ...model, notes: updatedNotes });
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-white/10">
      <h4 className="text-white font-bold mb-4 uppercase tracking-widest text-[10px] flex items-center gap-2">
        <MessageSquare size={14} /> Notes (Auto-delete after 15 days)
      </h4>
      
      {isAdmin && (
        <form onSubmit={handleAddNote} className="bg-black/50 p-4 rounded-xl border border-white/5 mb-4 space-y-3">
          <textarea 
            value={newNote} 
            onChange={e => setNewNote(e.target.value)} 
            placeholder="Add a note for this model..." 
            required
            rows={2}
            className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-white/50 text-white resize-none"
          />
          <button 
            type="submit" 
            disabled={isSaving || !newNote.trim()}
            className="w-full bg-white text-black px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
          >
            <Plus size={14} /> Add Note
          </button>
        </form>
      )}

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {validNotes.length === 0 ? (
          <p className="text-xs text-zinc-500 italic">No notes available.</p>
        ) : (
          validNotes.map(note => (
            <div key={note.id} className="flex items-start justify-between bg-black/30 p-3 rounded-lg border border-white/5">
              <div className="flex-1">
                <p className="text-sm text-white leading-snug whitespace-pre-wrap">{note.text}</p>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-2">
                  {new Date(note.date).toLocaleString()} • {note.author}
                </p>
              </div>
              {isAdmin && (
                <button 
                  onClick={() => handleDeleteNote(note.id)}
                  className="text-zinc-500 hover:text-red-500 p-1 transition-colors ml-2"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
