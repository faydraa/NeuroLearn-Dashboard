import { useState, useEffect } from 'react';
import { RotateCcw, Trophy, Clock, Sparkles } from 'lucide-react';

type Card = {
  id: number;
  value: string;
  isFlipped: boolean;
  isMatched: boolean;
};

export function MemoryGames() {
  const [gameMode, setGameMode] = useState<'menu' | 'memory' | 'sequence'>('menu');
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isGameActive, setIsGameActive] = useState(false);
  const [sequence, setSequence] = useState<number[]>([]);
  const [sequenceLevel, setSequenceLevel] = useState(1);
  const [showSequence, setShowSequence] = useState(false);
  const [playerInput, setPlayerInput] = useState('');
  const [sequenceError, setSequenceError] = useState(false);

  const emojis = ['🧠', '📚', '✨', '🐼', '💡', '🔥', '⭐', '🎨'];

  // Timer effect
  useEffect(() => {
    if (isGameActive) {
      const interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isGameActive]);

  // Memory Game Logic
  const startMemoryGame = () => {
    const shuffledEmojis = [...emojis, ...emojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        value: emoji,
        isFlipped: false,
        isMatched: false,
      }));

    setCards(shuffledEmojis);
    setFlippedCards([]);
    setMoves(0);
    setMatches(0);
    setTimer(0);
    setIsGameActive(true);
    setGameMode('memory');
  };

  const handleCardClick = (id: number) => {
    if (flippedCards.length === 2 || cards[id].isFlipped || cards[id].isMatched) return;

    const newCards = [...cards];
    newCards[id].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedCards, id];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);

      setTimeout(() => {
        checkMatch(newFlipped);
      }, 800);
    }
  };

  const checkMatch = (flipped: number[]) => {
    const [first, second] = flipped;
    const newCards = [...cards];

    if (newCards[first].value === newCards[second].value) {
      newCards[first].isMatched = true;
      newCards[second].isMatched = true;
      setMatches((m) => m + 1);

      if (matches + 1 === emojis.length) {
        setIsGameActive(false);
      }
    } else {
      newCards[first].isFlipped = false;
      newCards[second].isFlipped = false;
    }

    setCards(newCards);
    setFlippedCards([]);
  };

  // Sequence Memory Game Logic
  const startSequenceGame = () => {
    setGameMode('sequence');
    setSequenceLevel(1);
    setPlayerInput('');
    setSequenceError(false);
    generateSequence(1);
  };

  const generateSequence = (level: number) => {
    const length = level + 2;
    const newSequence = Array.from({ length }, () => Math.floor(Math.random() * 10));
    setSequence(newSequence);
    setPlayerInput('');
    setSequenceError(false);
    setShowSequence(true);
    setTimer(0);
    setIsGameActive(true);

    setTimeout(() => {
      setShowSequence(false);
    }, length * 800);
  };

  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/[^0-9]/g, '');

    if (input.length <= sequence.length) {
      setPlayerInput(input);

      let isCorrect = true;
      for (let i = 0; i < input.length; i++) {
        if (parseInt(input[i]) !== sequence[i]) {
          isCorrect = false;
          setSequenceError(true);
          setIsGameActive(false);
          break;
        }
      }

      if (isCorrect && input.length === sequence.length) {
        setTimeout(() => {
          setSequenceLevel((lvl) => lvl + 1);
          generateSequence(sequenceLevel + 1);
        }, 1000);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (gameMode === 'menu') {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Memory Games</h1>
          <p className="text-gray-600">Improve your cognitive abilities and memory retention</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div
            className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-8 text-white cursor-pointer hover:scale-105 transition transform"
            onClick={startMemoryGame}
          >
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Card Matching</h2>
            <p className="text-purple-100 mb-4">
              Test your visual memory by matching pairs of cards. Improve focus and attention to detail.
            </p>
            <div className="flex items-center gap-2 text-purple-100">
              <Trophy className="w-5 h-5" />
              <span className="text-sm">Difficulty: Beginner</span>
            </div>
          </div>

          <div
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-8 text-white cursor-pointer hover:scale-105 transition transform"
            onClick={startSequenceGame}
          >
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mb-4">
              <Clock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Number Sequence</h2>
            <p className="text-blue-100 mb-4">
              Watch numbers appear then type them in order. Enhances working memory and recall.
            </p>
            <div className="flex items-center gap-2 text-blue-100">
              <Trophy className="w-5 h-5" />
              <span className="text-sm">Difficulty: Progressive</span>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Benefits of Memory Games</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🧠</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Enhanced Memory</p>
                <p className="text-sm text-gray-600">Strengthen short-term and working memory</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-lg">⚡</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Faster Processing</p>
                <p className="text-sm text-gray-600">Improve cognitive processing speed</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🎯</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Better Focus</p>
                <p className="text-sm text-gray-600">Increase attention span and concentration</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-lg">📈</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Academic Performance</p>
                <p className="text-sm text-gray-600">Support better learning outcomes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameMode === 'memory') {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Card Matching Game</h1>
            <p className="text-gray-600">Find all matching pairs</p>
          </div>
          <button
            onClick={() => setGameMode('menu')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition"
          >
            Back to Menu
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold text-gray-900">{formatTime(timer)}</p>
            <p className="text-sm text-gray-600">Time</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <Sparkles className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <p className="text-2xl font-bold text-gray-900">{moves}</p>
            <p className="text-sm text-gray-600">Moves</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <Trophy className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
            <p className="text-2xl font-bold text-gray-900">
              {matches}/{emojis.length}
            </p>
            <p className="text-sm text-gray-600">Matches</p>
          </div>
        </div>

        {/* ✅ Smaller Board + tighter spacing */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-4 gap-3 max-w-3xl mx-auto">
            {cards.map((card) => (
              <button
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                disabled={card.isMatched || card.isFlipped}
                className={`aspect-square rounded-lg text-2xl md:text-3xl font-bold transition transform hover:scale-105 ${
                  card.isFlipped || card.isMatched
                    ? 'bg-white border-2 border-purple-500'
                    : 'bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
                } ${card.isMatched ? 'opacity-50' : ''}`}
              >
                {card.isFlipped || card.isMatched ? card.value : '?'}
              </button>
            ))}
          </div>
        </div>

        {!isGameActive && matches === emojis.length && (
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-8 text-white text-center">
            <Trophy className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-2">Congratulations!</h2>
            <p className="text-green-100 mb-4">
              You completed the game in {moves} moves and {formatTime(timer)}!
            </p>
            <button
              onClick={startMemoryGame}
              className="bg-white text-green-600 px-6 py-3 rounded-lg font-medium hover:bg-green-50 transition inline-flex items-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              Play Again
            </button>
          </div>
        )}
      </div>
    );
  }

  if (gameMode === 'sequence') {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Number Sequence Game</h1>
            <p className="text-gray-600">Remember the sequence of numbers and type them in order</p>
          </div>
          <button
            onClick={() => setGameMode('menu')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition"
          >
            Back to Menu
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <Trophy className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
            <p className="text-2xl font-bold text-gray-900">Level {sequenceLevel}</p>
            <p className="text-sm text-gray-600">Current Level</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <Sparkles className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <p className="text-2xl font-bold text-gray-900">{sequence.length}</p>
            <p className="text-sm text-gray-600">Sequence Length</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
          <div className="max-w-2xl mx-auto">
            {showSequence ? (
              <div className="text-center mb-8">
                <p className="text-lg font-medium text-gray-700 mb-4">Watch carefully:</p>
                <div className="flex justify-center items-center gap-2 flex-wrap">
                  {sequence.map((digit, index) => (
                    <div
                      key={index}
                      className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-3xl font-bold animate-pulse"
                      style={{
                        animationDelay: `${index * 0.8}s`,
                        animationDuration: '0.8s',
                      }}
                    >
                      {digit}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-lg font-medium text-gray-700 mb-4">Enter the sequence you saw:</p>
                <input
                  type="text"
                  value={playerInput}
                  onChange={handleNumberInput}
                  autoFocus
                  disabled={!isGameActive || showSequence}
                  placeholder="Type the numbers..."
                  className={`w-full max-w-md text-center text-3xl font-bold px-6 py-4 rounded-xl border-2 transition ${
                    sequenceError
                      ? 'border-red-500 bg-red-50'
                      : playerInput.length === sequence.length && isGameActive
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 focus:border-blue-500 focus:outline-none'
                  }`}
                />
                <div className="mt-4 flex justify-center gap-2">
                  {sequence.map((_, index) => (
                    <div
                      key={index}
                      className={`w-3 h-3 rounded-full transition ${
                        index < playerInput.length
                          ? sequenceError
                            ? 'bg-red-500'
                            : 'bg-green-500'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-600 mt-4">
                  {playerInput.length}/{sequence.length} digits entered
                </p>
              </div>
            )}
          </div>
        </div>

        {!showSequence && playerInput.length === sequence.length && isGameActive && (
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white text-center mb-6">
            <Trophy className="w-12 h-12 mx-auto mb-2" />
            <p className="text-xl font-bold">Correct! Moving to Level {sequenceLevel + 1}...</p>
          </div>
        )}

        {!isGameActive && !showSequence && sequenceError && (
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-8 text-white text-center">
            <h2 className="text-3xl font-bold mb-2">Game Over!</h2>
            <p className="text-orange-100 mb-2">
              You reached level {sequenceLevel} with a sequence of {sequence.length} digits!
            </p>
            <p className="text-orange-100 mb-4">
              The correct sequence was: <span className="font-bold">{sequence.join(' ')}</span>
            </p>
            <button
              onClick={startSequenceGame}
              className="bg-white text-orange-600 px-6 py-3 rounded-lg font-medium hover:bg-orange-50 transition inline-flex items-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              Try Again
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}