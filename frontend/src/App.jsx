import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Quiz from './pages/Quiz';
import History from './pages/History';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/quiz/:id" element={<Quiz />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
