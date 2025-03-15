import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [prompts, setPrompts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [answeredPrompts, setAnsweredPrompts] = useState(new Set());

  // Fisher-Yates shuffle algorithm
  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  // Function to parse CSV with quoted fields that may contain newlines
  const parseCSV = (text) => {
    const rows = [];
    let row = [];
    let inQuotes = false;
    let currentValue = '';
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Handle escaped quotes
          currentValue += '"';
          i++;
        } else {
          // Toggle quotes mode
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        row.push(currentValue.trim());
        currentValue = '';
      } else if (char === '\n' && !inQuotes) {
        // End of row
        row.push(currentValue.trim());
        if (row.length > 1) { // Skip empty rows
          rows.push(row);
        }
        row = [];
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    // Handle last row
    if (currentValue || row.length > 0) {
      row.push(currentValue.trim());
      if (row.length > 1) {
        rows.push(row);
      }
    }
    
    return rows;
  };

  useEffect(() => {
    fetch('/data/writingprompts_generations.csv')
      .then(response => response.text())
      .then(csv => {
        const rows = parseCSV(csv);
        const headers = rows[0];
        const parsedPrompts = rows.slice(1)
          .map(values => {
            if (values.length >= 5) {
              return {
                id: values[0],
                prompt: values[1],
                responseA: values[2],
                responseB: values[3],
                correctAnswer: values[4].trim()
              };
            }
            return null;
          })
          .filter(Boolean);
        
        // Randomize the order of prompts
        setPrompts(shuffleArray([...parsedPrompts]));
      })
      .catch(error => {
        console.error('Error loading prompts:', error);
      });
  }, []);

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'Enter' && selectedResponse) {
        handleSubmitAnswer();
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [selectedResponse]);

  const handleResponseSelect = (response) => {
    setSelectedResponse(response);
  };

  const handleSubmitAnswer = () => {
    if (!selectedResponse || answeredPrompts.has(currentIndex)) return;

    const newAnsweredPrompts = new Set(answeredPrompts);
    newAnsweredPrompts.add(currentIndex);
    setAnsweredPrompts(newAnsweredPrompts);
    setCompletedCount(prev => prev + 1);

    if (selectedResponse === prompts[currentIndex].correctAnswer) {
      setScore(prevScore => prevScore + 1);
    }

    // Move to next prompt if available
    if (currentIndex < prompts.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedResponse(null);
    }
  };

  if (prompts.length === 0) return <div>Loading...</div>;

  return (
    <div className="App">
      <header>
        <h1>Model Writing Evaluation Arena 🤖</h1>
        <div className="header-stats">
          <span className="completed-count">
            Evaluated: {completedCount}/{prompts.length}
          </span>
          <button 
            className="reveal-score-btn"
            onClick={() => setShowScore(!showScore)}
          >
            {showScore ? `Custom Model Score: ${score}/${completedCount}` : 'Reveal Custom Model Score'}
          </button>
        </div>
      </header>

      <div className="evaluation-container">
        <div className="info-text">
          <span>Rate the quality of the AI-generated writing, given the prompt. Press Enter after selecting to submit.</span>
        </div>

        <div className="prompt-section">
          <h3>Prompt:</h3>
          <p>{prompts[currentIndex].prompt}</p>
        </div>

        <div className="responses-section">
          <div 
            className={`response ${selectedResponse === 'A' ? 'selected' : ''}`}
            onClick={() => handleResponseSelect('A')}
          >
            {prompts[currentIndex].responseA}
          </div>
          <div 
            className={`response ${selectedResponse === 'B' ? 'selected' : ''}`}
            onClick={() => handleResponseSelect('B')}
          >
            {prompts[currentIndex].responseB}
          </div>
        </div>

        <button 
          className={`submit-btn ${!selectedResponse ? 'disabled' : ''}`}
          onClick={handleSubmitAnswer}
          disabled={!selectedResponse || answeredPrompts.has(currentIndex)}
        >
          {answeredPrompts.has(currentIndex) ? 'Submitted' : 'Submit (or press Enter)'}
        </button>
      </div>
    </div>
  );
}

export default App;
