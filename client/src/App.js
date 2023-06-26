import React, { useState } from 'react';
import './App.css';

function App() {
  const [showName, setShowName] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [showFullSynopsis, setShowFullSynopsis] = useState(false);
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const response = await fetch(`/api/showinfo?showName=${showName}`);
    const data = await response.json();
    setSynopsis(data.plot);
    setShowFullSynopsis(false);  // Reset the Show More toggle
    setTitle(data.title);
    setYear(data.year);
    setUrl(data.url);
    const eventsResponse = await fetch(`/api/events?showName=${showName}`);
    const eventsData = await eventsResponse.json();
    setEvents(eventsData);
  };

  const toggleSynopsis = () => {
    setShowFullSynopsis(!showFullSynopsis);
  };

  const getShortSynopsis = (synopsis, wordLimit) => {
    const words = synopsis.split(' ');
    if (words.length > wordLimit) {
      return words.slice(0, wordLimit).join(' ') + '...';
    } else {
      return synopsis;
    }
  };

  return (
    <div className="App">
      <form onSubmit={handleSubmit}>
        <label>
          TV Show Name:
          <input type="text" value={showName} onChange={e => setShowName(e.target.value)} />
        </label>
        <input type="submit" value="Submit" />
      </form>
     {title && year && url && <h1><a href={url}>{title} ({year})</a></h1>}
     {synopsis && <p>Synopsis: {showFullSynopsis ? synopsis : getShortSynopsis(synopsis, 50)} <button onClick={toggleSynopsis}>{showFullSynopsis ? 'Show Less' : 'Show More'}</button></p>}
      <table>
        <thead><tr><th>Bingo Moment</th><th>Score</th></tr></thead><tbody>
      {events && events.map((event, index) => (
        <tr key={index}><td>{event.event}</td><td>{event.likelihood}</td></tr>
      ))}
      </tbody>
      </table>
    </div>
  );
}

export default App;
