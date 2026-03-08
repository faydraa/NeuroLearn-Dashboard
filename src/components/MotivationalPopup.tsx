import { useState, useEffect } from 'react';
import { X, Sparkles, Heart, Brain, Zap } from 'lucide-react';

type MotivationalPopupProps = {
  onClose: () => void;
};

type Quote = {
  text: string;
  author: string;
  type: 'motivation' | 'meditation' | 'study';
  icon: React.ElementType;
};

const quotes: Quote[] = [
  {
    text: "Take a deep breath. Inhale for 4 counts, hold for 4, exhale for 4. Repeat 3 times.",
    author: "Breathing Exercise",
    type: 'meditation',
    icon: Heart,
  },
  {
    text: "Your brain works best with regular breaks. Stand up, stretch, and hydrate!",
    author: "Study Tip",
    type: 'study',
    icon: Brain,
  },
  {
    text: "Success is the sum of small efforts repeated day in and day out.",
    author: "Robert Collier",
    type: 'motivation',
    icon: Sparkles,
  },
  {
    text: "Try the 20-20-20 rule: Every 20 minutes, look at something 20 feet away for 20 seconds.",
    author: "Eye Care Tip",
    type: 'study',
    icon: Zap,
  },
  {
    text: "Focus on progress, not perfection. Every study session is a step forward.",
    author: "Learning Mindset",
    type: 'motivation',
    icon: Sparkles,
  },
  {
    text: "Practice mindful meditation: Close your eyes and focus on your breath for 2 minutes.",
    author: "Mindfulness Exercise",
    type: 'meditation',
    icon: Heart,
  },
  {
    text: "The expert in anything was once a beginner. Keep going!",
    author: "Helen Hayes",
    type: 'motivation',
    icon: Sparkles,
  },
  {
    text: "Studies show that teaching others helps you retain 90% of what you learn. Explain concepts aloud!",
    author: "Learning Strategy",
    type: 'study',
    icon: Brain,
  },
  {
    text: "Ground yourself: Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste.",
    author: "Grounding Exercise",
    type: 'meditation',
    icon: Heart,
  },
  {
    text: "Your only limit is you. Believe in yourself and you're halfway there.",
    author: "Theodore Roosevelt",
    type: 'motivation',
    icon: Zap,
  },
];

export function MotivationalPopup({ onClose }: MotivationalPopupProps) {
  const [currentQuote, setCurrentQuote] = useState<Quote>(quotes[0]);

  useEffect(() => {
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    setCurrentQuote(randomQuote);
  }, []);

  const typeColors = {
    motivation: {
      bg: 'from-purple-500 to-purple-600',
      text: 'text-purple-600',
      iconBg: 'bg-purple-100',
    },
    meditation: {
      bg: 'from-green-500 to-green-600',
      text: 'text-green-600',
      iconBg: 'bg-green-100',
    },
    study: {
      bg: 'from-blue-500 to-blue-600',
      text: 'text-blue-600',
      iconBg: 'bg-blue-100',
    },
  };

  const colors = typeColors[currentQuote.type];
  const Icon = currentQuote.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fadeIn">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
        }
      `}</style>
      
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-slideUp">
        {/* Header */}
        <div className={`bg-gradient-to-r ${colors.bg} rounded-t-2xl p-6 text-white relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm opacity-90">Time for a break!</p>
              <p className="font-bold text-lg capitalize">{currentQuote.type}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-lg text-gray-800 mb-4 leading-relaxed">
            "{currentQuote.text}"
          </p>
          <p className="text-sm text-gray-600 italic">— {currentQuote.author}</p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className={`w-full ${colors.text} bg-gray-50 hover:bg-gray-100 py-3 rounded-lg font-medium transition`}
          >
            Got it, thanks!
          </button>
        </div>

        {/* Meditation Tips Section */}
        {currentQuote.type === 'meditation' && (
          <div className="px-6 pb-6 border-t border-gray-200 pt-4">
            <h4 className="font-bold text-gray-900 mb-3 text-sm">Quick Meditation Tips:</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-green-600">•</span>
                <span>Find a quiet, comfortable space</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">•</span>
                <span>Start with just 2-5 minutes daily</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">•</span>
                <span>Focus on your breath or a mantra</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">•</span>
                <span>Don't judge your thoughts, just observe</span>
              </li>
            </ul>
          </div>
        )}

        {/* Study Tips Section */}
        {currentQuote.type === 'study' && (
          <div className="px-6 pb-6 border-t border-gray-200 pt-4">
            <h4 className="font-bold text-gray-900 mb-3 text-sm">Effective Study Strategies:</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Use active recall instead of re-reading</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Practice spaced repetition for retention</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Create visual mind maps for complex topics</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Take breaks every 45-50 minutes</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
