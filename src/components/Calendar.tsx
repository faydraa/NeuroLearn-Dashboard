import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Clock, AlertCircle } from 'lucide-react';
import type { CalendarEvent } from '../App';
import { supabase } from '../library/supabase';

type CalendarProps = {
  userName: string;
  userId: string;
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
};

type EventType = 'study' | 'exam' | 'assignment' | 'other';

const TYPE_COLORS: Record<EventType, string> = {
  study: 'bg-green-500',
  exam: 'bg-red-500',
  assignment: 'bg-blue-500',
  other: 'bg-purple-500',
};

export function Calendar({ userName, userId, events, setEvents }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    time: '',
    type: 'study' as EventType,
  });
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [error, setError] = useState('');

  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();

  const monthNames = useMemo(
    () => [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ],
    []
  );

  const mapDbEventToUiEvent = (dbEvent: any): CalendarEvent => ({
    id: dbEvent.id,
    title: dbEvent.title,
    date: dbEvent.event_date,
    time: dbEvent.event_time || '09:00',
    type: dbEvent.event_type as EventType,
    color: TYPE_COLORS[(dbEvent.event_type as EventType) || 'other'],
  });

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleAddEvent = async () => {
    if (!selectedDate || !newEvent.title.trim()) return;

    try {
      setError('');
      setIsSavingEvent(true);

      const payload = {
        user_id: userId,
        title: newEvent.title.trim(),
        event_date: selectedDate,
        event_time: newEvent.time || '09:00',
        event_type: newEvent.type,
      };

      const { data, error } = await supabase
        .from('calendar_events')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      const savedEvent = mapDbEventToUiEvent(data);

      setEvents((prev) =>
        [...prev, savedEvent].sort((a, b) => {
          const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
          if (dateCompare !== 0) return dateCompare;
          return a.time.localeCompare(b.time);
        })
      );

      setNewEvent({ title: '', time: '', type: 'study' });
      setShowAddEvent(false);
    } catch (err: any) {
      console.error('Failed to add event:', err);
      setError(err.message || 'Failed to add event.');
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      setError('');

      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEvents((prev) => prev.filter((event) => event.id !== id));
    } catch (err: any) {
      console.error('Failed to delete event:', err);
      setError(err.message || 'Failed to delete event.');
    }
  };

  const getEventsForDate = (date: string) => {
    return events.filter((event) => event.date === date);
  };

  const renderCalendarDays = () => {
    const days = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateStr = formatLocalDate(date);

      const dayEvents = getEventsForDate(dateStr);
      const todayStr = formatLocalDate(new Date());
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedDate;

      days.push(
        <div
          key={day}
          onClick={() => setSelectedDate(dateStr)}
          className={`aspect-square border border-gray-200 p-2 cursor-pointer hover:bg-gray-50 transition ${
            isToday ? 'bg-indigo-50 border-indigo-500' : ''
          } ${isSelected ? 'ring-2 ring-indigo-600' : ''}`}
        >
          <div className="flex flex-col h-full">
            <span className={`text-sm font-medium ${isToday ? 'text-indigo-600' : 'text-gray-900'}`}>
              {day}
            </span>
            <div className="flex-1 mt-1 space-y-1 overflow-y-auto">
              {dayEvents.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className={`${event.color} text-white text-xs px-1 py-0.5 rounded truncate`}
                  title={event.title}
                >
                  {event.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-xs text-gray-500">+{dayEvents.length - 3} more</div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return days;
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const upcomingEvents = events
    .filter((event) => new Date(`${event.date}T${event.time || '00:00'}`) >= new Date())
    .sort((a, b) => {
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    })
    .slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Study Calendar</h1>
        <p className="text-gray-600">Plan your upcoming study sessions, assignments and more </p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={previousMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-0 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0">{renderCalendarDays()}</div>

          <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600">Study Session</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-sm text-gray-600">Exam/Assignment</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-sm text-gray-600">Personal Activity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span className="text-sm text-gray-600">Others</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {selectedDate && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">
                  {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h3>
                <button
                  onClick={() => setShowAddEvent(true)}
                  className="p-2 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition"
                >
                  <Plus className="w-5 h-5 text-indigo-600" />
                </button>
              </div>

              {selectedDateEvents.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No events scheduled</p>
              ) : (
                <div className="space-y-3">
                  {selectedDateEvents.map((event) => (
                    <div
                      key={event.id}
                      className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 ${event.color} rounded-full`}></div>
                          <p className="font-medium text-gray-900">{event.title}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="p-1 hover:bg-red-100 rounded transition"
                        >
                          <X className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 ml-5">
                        <Clock className="w-4 h-4" />
                        <span>{event.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {showAddEvent && selectedDate && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Add Event</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Title
                  </label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    placeholder="e.g., Math Study Session"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time
                  </label>
                  <input
                    type="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as EventType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  >
                    <option value="study">Study Session</option>
                    <option value="exam">Exam/Assignment</option>
                    <option value="assignment">Personal Activity</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleAddEvent}
                    disabled={isSavingEvent}
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingEvent ? 'Adding...' : 'Add Event'}
                  </button>
                  <button
                    onClick={() => setShowAddEvent(false)}
                    className="px-4 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Upcoming Events</h3>
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 ${event.color} rounded-full mt-2`}></div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{event.title}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(`${event.date}T00:00:00`).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      at {event.time}
                    </p>
                  </div>
                </div>
              ))}
              {upcomingEvents.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">
                  No upcoming events
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}