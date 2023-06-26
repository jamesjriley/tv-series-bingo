import React, { useState } from 'react';
import './App.css';

function App() {
  const [showName, setShowName] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const response = await fetch(`/api/showinfo?showName=${showName}`);
    const data = await response.json();
    setSynopsis(data.plot);
    setTitle(data.title);
    setYear(data.year);
    setUrl(data.url);
    const eventsResponse = await fetch(`/api/events?showName=${showName}`);
    const eventsData = await eventsResponse.json();
    setEvents(eventsData);
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
      {synopsis && <p>Synopsis: {synopsis}</p>}
      {events && events.map((event, index) => (
        <p key={index}>{event.event}: {event.likelihood}% likelihood</p>
      ))}
    </div>
  );
}

export default App;
