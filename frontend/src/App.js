import React, { useState, useEffect } from 'react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const JobCategories = {
  handyman: 'Handyman',
  electrician: 'Electrician', 
  plumber: 'Plumber',
  painter: 'Painter',
  allrounder: 'Allrounder'
};

const ExperienceLevels = {
  1: '⭐ Beginner',
  2: '⭐⭐ Intermediate', 
  3: '⭐⭐⭐ Expert'
};

function App() {
  const [currentView, setCurrentView] = useState('home');
  const [jobs, setJobs] = useState([]);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [matches, setMatches] = useState([]);
  const [potentialMatches, setPotentialMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Job posting form state
  const [formData, setFormData] = useState({
    job_type: 'seeking_worker',
    category: 'handyman',
    name: '',
    phone: '',
    hourly_rate: '',
    experience_level: 1,
    description: '',
    location: ''
  });

  useEffect(() => {
    if (currentView === 'browse' && currentJobId) {
      loadPotentialMatches();
    }
    if (currentView === 'matches' && currentJobId) {
      loadMatches();
    }
  }, [currentView, currentJobId]);

  const loadJobs = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/jobs`);
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const loadPotentialMatches = async () => {
    if (!currentJobId) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/jobs/${currentJobId}/potential-matches`);
      const data = await response.json();
      setPotentialMatches(data);
      setCurrentMatchIndex(0);
    } catch (error) {
      console.error('Error loading potential matches:', error);
    }
  };

  const loadMatches = async () => {
    if (!currentJobId) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/matches/${currentJobId}`);
      const data = await response.json();
      setMatches(data);
    } catch (error) {
      console.error('Error loading matches:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        const newJob = await response.json();
        alert('Job posted successfully!');
        setCurrentJobId(newJob.id);
        setCurrentView('browse');
        setFormData({
          job_type: 'seeking_worker',
          category: 'handyman',
          name: '',
          phone: '',
          hourly_rate: '',
          experience_level: 1,
          description: '',
          location: ''
        });
      }
    } catch (error) {
      console.error('Error creating job:', error);
      alert('Error posting job. Please try again.');
    }
  };

  const showInterest = async (interestedJobId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/show-interest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: currentJobId,
          interested_in_job_id: interestedJobId
        }),
      });
      
      const result = await response.json();
      
      if (result.is_matched) {
        alert('🎉 It\'s a Match! Both parties are interested. Check your matches to see contact details.');
        loadMatches();
      } else {
        alert('Interest recorded! If they\'re interested too, you\'ll get a match.');
      }
      
      // Move to next potential match
      if (currentMatchIndex < potentialMatches.length - 1) {
        setCurrentMatchIndex(currentMatchIndex + 1);
      } else {
        alert('No more potential matches. Check back later for new postings!');
        setCurrentView('matches');
      }
    } catch (error) {
      console.error('Error showing interest:', error);
    }
  };

  const skipMatch = () => {
    if (currentMatchIndex < potentialMatches.length - 1) {
      setCurrentMatchIndex(currentMatchIndex + 1);
    } else {
      alert('No more potential matches. Check back later for new postings!');
      setCurrentView('matches');
    }
  };

  const renderHome = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🔧 JobMatch
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Connect workers with employers instantly. Post your job or find work in seconds.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">👷‍♂️</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Looking for Workers?</h3>
            <p className="text-gray-600 mb-6">Post your job requirements and find skilled workers in your area.</p>
            <button
              onClick={() => {
                setFormData(prev => ({ ...prev, job_type: 'seeking_worker' }));
                setCurrentView('post');
              }}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Post a Job
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">🔨</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Looking for Work?</h3>
            <p className="text-gray-600 mb-6">Showcase your skills and find employment opportunities near you.</p>
            <button
              onClick={() => {
                setFormData(prev => ({ ...prev, job_type: 'seeking_work' }));
                setCurrentView('post');
              }}
              className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Find Work
            </button>
          </div>
        </div>

        <div className="text-center mt-12">
          <button
            onClick={() => {
              setCurrentView('jobs');
              loadJobs();
            }}
            className="text-blue-600 hover:text-blue-800 font-semibold underline"
          >
            Browse All Postings
          </button>
        </div>
      </div>
    </div>
  );

  const renderPostJob = () => (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
          <button
            onClick={() => setCurrentView('home')}
            className="text-blue-600 hover:text-blue-800 mb-6 flex items-center"
          >
            ← Back to Home
          </button>

          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            {formData.job_type === 'seeking_worker' ? '📋 Post a Job' : '💼 Find Work'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Job Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {Object.entries(JobCategories).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="City, State"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {formData.job_type === 'seeking_worker' ? 'Hourly Rate Offering (€)' : 'Expected Hourly Rate (€)'}
              </label>
              <input
                type="number"
                name="hourly_rate"
                value={formData.hourly_rate}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {formData.job_type === 'seeking_worker' ? 'Required Experience Level' : 'Your Experience Level'}
              </label>
              <select
                name="experience_level"
                value={formData.experience_level}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {Object.entries(ExperienceLevels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {formData.job_type === 'seeking_worker' ? 'Job Description' : 'About You & Your Skills'}
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="4"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={formData.job_type === 'seeking_worker' 
                  ? 'Describe the job, requirements, schedule, etc.' 
                  : 'Describe your experience, availability, and skills...'
                }
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {formData.job_type === 'seeking_worker' ? 'Post Job & Find Workers' : 'Post Profile & Find Work'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  const renderBrowse = () => {
    if (!potentialMatches.length) {
      return (
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-gray-800 mb-6">No More Matches</h2>
              <p className="text-gray-600 mb-8">Check back later for new postings!</p>
              <button
                onClick={() => setCurrentView('matches')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                View Your Matches
              </button>
            </div>
          </div>
        </div>
      );
    }

    const currentMatch = potentialMatches[currentMatchIndex];
    if (!currentMatch) return null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Find Your Match</h2>
              <p className="text-gray-600">{currentMatchIndex + 1} of {potentialMatches.length}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">
                  {currentMatch.job_type === 'seeking_worker' ? '👷‍♂️' : '🔨'}
                </div>
                <h3 className="text-2xl font-bold text-gray-800">{currentMatch.name}</h3>
                <p className="text-gray-600">{JobCategories[currentMatch.category]}</p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">📍 Location:</span>
                  <span className="font-semibold">{currentMatch.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">💰 Rate:</span>
                  <span className="font-semibold">€{currentMatch.hourly_rate}/hour</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">⭐ Experience:</span>
                  <span className="font-semibold">{ExperienceLevels[currentMatch.experience_level]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">📞 Phone:</span>
                  <span className="font-semibold">{currentMatch.phone}</span>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 mb-2">Description:</h4>
                <p className="text-gray-600 text-sm">{currentMatch.description}</p>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={skipMatch}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-400 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={() => showInterest(currentMatch.id)}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all"
                >
                  Interested! 💖
                </button>
              </div>
            </div>

            <div className="text-center space-x-4">
              <button
                onClick={() => setCurrentView('matches')}
                className="text-blue-600 hover:text-blue-800 font-semibold"
              >
                View Matches
              </button>
              <button
                onClick={() => setCurrentView('home')}
                className="text-gray-600 hover:text-gray-800 font-semibold"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMatches = () => (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Your Matches 💕</h2>
            <p className="text-gray-600">Successful connections where both parties showed interest</p>
          </div>

          {matches.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💔</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No matches yet</h3>
              <p className="text-gray-600 mb-6">Keep browsing to find your perfect match!</p>
              <button
                onClick={() => setCurrentView('browse')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                Continue Browsing
              </button>
            </div>
          ) : (
            <div className="grid gap-6">
              {matches.map((match) => (
                <div key={match.match_id} className="bg-white rounded-xl shadow-lg p-6">
                  <div className="text-center mb-4">
                    <div className="text-2xl mb-2">🎉 Match!</div>
                    <p className="text-sm text-gray-500">
                      Matched on {new Date(match.matched_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="border-r border-gray-200 pr-6">
                      <h4 className="font-semibold text-blue-600 mb-3">👷‍♂️ Employer</h4>
                      <div className="space-y-2">
                        <p><strong>{match.employer.name}</strong></p>
                        <p>📞 {match.employer.phone}</p>
                        <p>💰 €{match.employer.hourly_rate}/hour</p>
                        <p>📍 {match.employer.location}</p>
                        <p className="text-sm text-gray-600">{match.employer.description}</p>
                      </div>
                    </div>

                    <div className="pl-6">
                      <h4 className="font-semibold text-green-600 mb-3">🔨 Worker</h4>
                      <div className="space-y-2">
                        <p><strong>{match.worker.name}</strong></p>
                        <p>📞 {match.worker.phone}</p>
                        <p>💰 €{match.worker.hourly_rate}/hour</p>
                        <p>📍 {match.worker.location}</p>
                        <p>{ExperienceLevels[match.worker.experience_level]}</p>
                        <p className="text-sm text-gray-600">{match.worker.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                    <p className="text-sm text-gray-600 mb-3">
                      Both parties are interested! Contact each other to arrange work.
                    </p>
                    <div className="space-x-4">
                      <a
                        href={`tel:${match.employer.phone}`}
                        className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        Call Employer
                      </a>
                      <a
                        href={`tel:${match.worker.phone}`}
                        className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                      >
                        Call Worker
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-8 space-x-4">
            <button
              onClick={() => setCurrentView('browse')}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
            >
              Find More Matches
            </button>
            <button
              onClick={() => setCurrentView('home')}
              className="text-gray-600 hover:text-gray-800 font-semibold"
            >
              Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderJobs = () => (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => setCurrentView('home')}
            className="text-blue-600 hover:text-blue-800 mb-6 flex items-center"
          >
            ← Back to Home
          </button>

          <h2 className="text-3xl font-bold text-gray-800 mb-8">All Job Postings</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <div key={job.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="text-center mb-4">
                  <div className="text-3xl mb-2">
                    {job.job_type === 'seeking_worker' ? '👷‍♂️' : '🔨'}
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">{job.name}</h3>
                  <p className="text-gray-600">{JobCategories[job.category]}</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    job.job_type === 'seeking_worker' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {job.job_type === 'seeking_worker' ? 'Hiring' : 'Seeking Work'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <p><strong>📍</strong> {job.location}</p>
                  <p><strong>💰</strong> €{job.hourly_rate}/hour</p>
                  <p><strong>⭐</strong> {ExperienceLevels[job.experience_level]}</p>
                  <p><strong>📞</strong> {job.phone}</p>
                </div>

                <p className="text-gray-600 text-sm mb-4">{job.description}</p>

                <button
                  onClick={() => {
                    setCurrentJobId(job.id);
                    setCurrentView('browse');
                  }}
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 font-semibold"
                >
                  View Matches
                </button>
              </div>
            ))}
          </div>

          {jobs.length === 0 && (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">No job postings yet</h3>
              <p className="text-gray-600 mb-6">Be the first to post a job or job search!</p>
              <button
                onClick={() => setCurrentView('home')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                Post a Job
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render based on current view
  switch (currentView) {
    case 'home':
      return renderHome();
    case 'post':
      return renderPostJob();
    case 'browse':
      return renderBrowse();
    case 'matches':
      return renderMatches();
    case 'jobs':
      return renderJobs();
    default:
      return renderHome();
  }
}

export default App;