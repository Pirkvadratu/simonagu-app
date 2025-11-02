import React, { useState } from 'react';

const Profile = () => {
  const [hobbies, setHobbies] = useState('');
  const [favoriteFood, setFavoriteFood] = useState('');
  const [eventPreferences, setEventPreferences] = useState('');

  return (
    <div>
      <h1>Your Profile</h1>
      <input 
        placeholder="Hobbies" 
        value={hobbies} 
        onChange={e => setHobbies(e.target.value)} 
      />
      <input 
        placeholder="Favorite Food" 
        value={favoriteFood} 
        onChange={e => setFavoriteFood(e.target.value)} 
      />
      <input 
        placeholder="Event Preferences" 
        value={eventPreferences} 
        onChange={e => setEventPreferences(e.target.value)} 
      />
      <button>Save</button>
    </div>
  );
};

export default Profile;
