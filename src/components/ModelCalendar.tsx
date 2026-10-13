import React, { useState } from 'react';
import { Model, ModelEvent } from '../types';
import { Calendar, Plus, Trash2 } from 'lucide-react';

interface Props {
  model: Model;
  onUpdateModel?: (updatedModel: Model) => Promise<void>;
  isAdmin?: boolean;
}

export const ModelCalendar: React.FC<Props> = ({ model, onUpdateModel, isAdmin = true }) => {
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState<ModelEvent['type']>('photoshoot');
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveAsSingle, setSaveAsSingle] = useState(true);
  const [confirmDeleteEventId, setConfirmDeleteEventId] = useState<string | null>(null);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !title || !onUpdateModel || !isAdmin) return;

    setIsSaving(true);
    try {
      let newEvents: ModelEvent[] = [];

      if (endDate && endDate !== date && !saveAsSingle) {
        // Create separate events for each day
        let currentDate = new Date(date);
        const end = new Date(endDate);
        
        while (currentDate <= end) {
          newEvents.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            date: currentDate.toISOString().split('T')[0],
            type,
            title,
            status: 'pending'
          });
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else {
        // Create a single event (with or without endDate)
        newEvents.push({
          id: Date.now().toString(),
          date,
          endDate: endDate && endDate !== date ? endDate : undefined,
          type,
          title,
          status: 'pending'
        });
      }

      const updatedEvents = [...(model.events || []), ...newEvents].sort((a, b) => a.date.localeCompare(b.date));
      
      await onUpdateModel({ ...model, events: updatedEvents });

      // Send email notification
      if (model.email) {
        const eventTypeLabel = getTypeLabel(type);
        const eventDateStr = endDate && endDate !== date ? `${date} to ${endDate}` : date;
        fetch('/api/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: model.email,
            subject: `New Event Added: ${eventTypeLabel}`,
            text: `A new event has been added to your calendar.\n\nType: ${eventTypeLabel}\nTitle: ${title}\nDate: ${eventDateStr}\n\nPlease check your cabinet for more details.`,
            html: `<p>A new event has been added to your calendar.</p><ul><li><strong>Type:</strong> ${eventTypeLabel}</li><li><strong>Title:</strong> ${title}</li><li><strong>Date:</strong> ${eventDateStr}</li></ul><p>Please check your cabinet for more details.</p>`
          })
        }).catch(err => console.error('Failed to send event notification:', err));
      }

      setDate('');
      setEndDate('');
      setTitle('');
    } catch (error) {
      console.error('Error adding event:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!onUpdateModel || !isAdmin) return;
    try {
      const updatedEvents = (model.events || []).filter(e => e.id !== eventId);
      await onUpdateModel({ ...model, events: updatedEvents });
      setConfirmDeleteEventId(null);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const getTypeColor = (type: ModelEvent['type']) => {
    switch (type) {
      case 'photoshoot': return 'bg-blue-500';
      case 'fashion_week': return 'bg-green-500';
      case 'local_show': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeLabel = (type: ModelEvent['type']) => {
    switch (type) {
      case 'photoshoot': return 'Photoshoot';
      case 'fashion_week': return 'Fashion Week';
      case 'local_show': return 'Local Show';
      default: return type;
    }
  };

  const allEvents = (model.events || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="mt-6 pt-6 border-t border-white/10">
      <h4 className="text-white font-bold mb-4 uppercase tracking-widest text-[10px] flex items-center gap-2">
        <Calendar size={14} /> Schedule & Calendar
      </h4>
      
      {isAdmin && (
        <form onSubmit={handleAddEvent} className="bg-black/50 p-4 rounded-xl border border-white/5 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-500 uppercase">Start Date</label>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                required
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-white/50 text-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-500 uppercase">End Date (Optional)</label>
              <input 
                type="date" 
                value={endDate} 
                min={date}
                onChange={e => setEndDate(e.target.value)} 
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-white/50 text-white"
              />
            </div>
          </div>
          
          {endDate && endDate !== date && (
            <div className="flex items-center gap-2 mb-2">
              <input 
                type="checkbox" 
                id="saveAsSingle" 
                checked={saveAsSingle} 
                onChange={e => setSaveAsSingle(e.target.checked)}
                className="rounded bg-black border-white/10"
              />
              <label htmlFor="saveAsSingle" className="text-xs text-zinc-400 cursor-pointer">
                Save as a single continuous project
              </label>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <select 
              value={type} 
              onChange={e => setType(e.target.value as ModelEvent['type'])}
              className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-white/50 text-white"
            >
              <option value="photoshoot">Photoshoot (Blue)</option>
              <option value="fashion_week">Fashion Week (Green)</option>
              <option value="local_show">Local Show (Pink)</option>
            </select>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="Event Title..." 
              required
              className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-white/50 text-white"
            />
          </div>
          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full bg-white text-black px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-1 mt-2"
          >
            <Plus size={14} /> Add Event
          </button>
        </form>
      )}

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {allEvents.length === 0 ? (
          <p className="text-xs text-zinc-500 italic">No events scheduled.</p>
        ) : (
          allEvents.map(event => (
            <div key={event.id} className={`flex items-center justify-between bg-black/30 p-3 rounded-lg border ${event.status === 'completed' ? 'border-green-500/30' : event.status === 'missed' ? 'border-red-500/30' : 'border-white/5'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${getTypeColor(event.type)}`}></div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-bold leading-tight ${event.status === 'missed' ? 'text-red-400 line-through' : 'text-white'}`}>{event.title}</p>
                    {event.status === 'completed' && <span className="text-[8px] bg-green-500/20 text-green-400 px-1 py-0.5 rounded uppercase font-bold">Completed</span>}
                    {event.status === 'missed' && <span className="text-[8px] bg-red-500/20 text-red-400 px-1 py-0.5 rounded uppercase font-bold">Missed</span>}
                  </div>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
                    {event.date} {event.endDate ? ` - ${event.endDate}` : ''} • {getTypeLabel(event.type)}
                  </p>
                </div>
              </div>
              {isAdmin && (
                confirmDeleteEventId === event.id ? (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleDeleteEvent(event.id)}
                      className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors"
                    >
                      Confirm
                    </button>
                    <button 
                      onClick={() => setConfirmDeleteEventId(null)}
                      className="text-xs bg-zinc-700 text-white px-2 py-1 rounded hover:bg-zinc-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setConfirmDeleteEventId(event.id)}
                    className="text-zinc-500 hover:text-red-500 p-1 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
