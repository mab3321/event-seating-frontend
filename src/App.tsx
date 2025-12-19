import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, ZoomIn, ZoomOut, RotateCcw, Moon, Sun } from 'lucide-react';

interface Seat {
  id: string;
  col: number;
  x: number;
  y: number;
  priceTier: number;
  status: 'available' | 'reserved' | 'sold' | 'held';
}

interface Row {
  index: number;
  seats: Seat[];
}

interface Section {
  id: string;
  label: string;
  transform: { x: number; y: number; scale: number };
  rows: Row[];
}

interface VenueData {
  venueId: string;
  name: string;
  map: { width: number; height: number };
  sections: Section[];
}

const PRICE_TIERS = {
  1: { price: 150, color: '#10b981' },
  2: { price: 100, color: '#3b82f6' },
  3: { price: 75, color: '#8b5cf6' },
  4: { price: 50, color: '#f59e0b' }
};

const MAX_SEATS = 8;

export default function EventSeatingMap() {
  const [venueData, setVenueData] = useState<VenueData | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [focusedSeat, setFocusedSeat] = useState<Seat | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const mockVenueData: VenueData = {
      venueId: "arena-01",
      name: "Metropolis Arena",
      map: { width: 1024, height: 768 },
      sections: generateMockSections()
    };
    setVenueData(mockVenueData);

    const saved = localStorage.getItem('selectedSeats');
    if (saved) {
      try {
        setSelectedSeats(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved seats');
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('selectedSeats', JSON.stringify(selectedSeats));
  }, [selectedSeats]);

  const generateMockSections = (): Section[] => {
    const sections: Section[] = [];
    const sectionLabels = ['A', 'B', 'C', 'D'];
    
    sectionLabels.forEach((label, sIdx) => {
      const rows: Row[] = [];
      const rowCount = 20;
      const seatsPerRow = 25;
      
      for (let r = 0; r < rowCount; r++) {
        const seats: Seat[] = [];
        for (let s = 0; s < seatsPerRow; s++) {
          const statuses: Seat['status'][] = ['available', 'available', 'available', 'reserved', 'sold'];
          seats.push({
            id: `${label}-${r + 1}-${String(s + 1).padStart(2, '0')}`,
            col: s + 1,
            x: 100 + sIdx * 250 + s * 12,
            y: 100 + r * 15,
            priceTier: Math.min(4, Math.floor(r / 5) + 1) as 1 | 2 | 3 | 4,
            status: statuses[Math.floor(Math.random() * statuses.length)]
          });
        }
        rows.push({ index: r + 1, seats });
      }
      
      sections.push({
        id: label,
        label: `Section ${label}`,
        transform: { x: 0, y: 0, scale: 1 },
        rows
      });
    });
    
    return sections;
  };

  const handleSeatClick = useCallback((seat: Seat) => {
    if (seat.status !== 'available') return;

    setSelectedSeats(prev => {
      const isSelected = prev.some(s => s.id === seat.id);
      if (isSelected) {
        return prev.filter(s => s.id !== seat.id);
      }
      if (prev.length >= MAX_SEATS) {
        alert(`Maximum ${MAX_SEATS} seats allowed`);
        return prev;
      }
      return [...prev, seat];
    });
    setFocusedSeat(seat);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, seat: Seat) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSeatClick(seat);
    }
  }, [handleSeatClick]);

  const getSeatColor = (seat: Seat) => {
    if (selectedSeats.some(s => s.id === seat.id)) return '#ef4444';
    if (seat.status === 'sold') return '#6b7280';
    if (seat.status === 'reserved') return '#f59e0b';
    if (seat.status === 'held') return '#ec4899';
    if (showHeatmap) return PRICE_TIERS[seat.priceTier as keyof typeof PRICE_TIERS]?.color || '#10b981';
    return '#10b981';
  };

  const calculateSubtotal = () => {
    return selectedSeats.reduce((sum, seat) => {
      return sum + (PRICE_TIERS[seat.priceTier as keyof typeof PRICE_TIERS]?.price || 0);
    }, 0);
  };

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const findAdjacentSeats = (count: number) => {
    if (!venueData) return;

    for (const section of venueData.sections) {
      for (const row of section.rows) {
        for (let i = 0; i <= row.seats.length - count; i++) {
          const adjacentSeats = row.seats.slice(i, i + count);
          if (adjacentSeats.every(s => s.status === 'available')) {
            setSelectedSeats(adjacentSeats);
            alert(`Found ${count} adjacent seats in ${section.label}, Row ${row.index}`);
            return;
          }
        }
      }
    }
    alert(`No ${count} adjacent seats available`);
  };

  if (!venueData) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  const filteredSeats = searchTerm ? venueData.sections.flatMap(s => 
    s.rows.flatMap(r => r.seats)
  ).filter(seat => seat.id.toLowerCase().includes(searchTerm.toLowerCase())) : [];

  return (
    <div className={`h-screen flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md p-4`}>
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">{venueData.name}</h1>
          
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search seats (e.g., A-1-01)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                  aria-label="Search seats"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleZoom(0.2)}
                className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                aria-label="Zoom in"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleZoom(-0.2)}
                className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                aria-label="Zoom out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                onClick={resetView}
                className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                aria-label="Reset view"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`px-4 py-2 rounded-lg ${showHeatmap ? 'bg-blue-600 text-white' : darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
              >
                Heatmap
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>

            <button
              onClick={() => findAdjacentSeats(2)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Find 2 Adjacent
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Seating Map */}
        <div 
          className="flex-1 relative overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${venueData.map.width} ${venueData.map.height}`}
            className="w-full h-full"
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`
            }}
          >
            {venueData.sections.map(section => (
              <g key={section.id}>
                <text x={section.rows[0]?.seats[0]?.x || 0} y={(section.rows[0]?.seats[0]?.y || 0) - 20} className="text-sm font-bold fill-current">
                  {section.label}
                </text>
                {section.rows.map(row =>
                  row.seats.map(seat => (
                    <circle
                      key={seat.id}
                      cx={seat.x}
                      cy={seat.y}
                      r="4"
                      fill={getSeatColor(seat)}
                      stroke={focusedSeat?.id === seat.id ? '#fff' : 'none'}
                      strokeWidth="2"
                      style={{
                        cursor: seat.status === 'available' ? 'pointer' : 'not-allowed',
                        opacity: seat.status === 'sold' ? 0.5 : 1
                      }}
                      onClick={() => handleSeatClick(seat)}
                      onKeyDown={(e) => handleKeyDown(e, seat)}
                      tabIndex={seat.status === 'available' ? 0 : -1}
                      aria-label={`Seat ${seat.id}, ${seat.status}, $${PRICE_TIERS[seat.priceTier as keyof typeof PRICE_TIERS]?.price}`}
                      role="button"
                    />
                  ))
                )}
              </g>
            ))}
          </svg>

          {searchTerm && filteredSeats.length > 0 && (
            <div className={`absolute top-4 left-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 rounded-lg shadow-lg max-h-64 overflow-y-auto`}>
              <h3 className="font-bold mb-2">Search Results ({filteredSeats.length})</h3>
              {filteredSeats.slice(0, 10).map(seat => (
                <div key={seat.id} className="text-sm py-1">
                  {seat.id} - {seat.status}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className={`w-80 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg p-6 overflow-y-auto`}>
          <h2 className="text-xl font-bold mb-4">Selected Seats ({selectedSeats.length}/{MAX_SEATS})</h2>
          
          {selectedSeats.length === 0 ? (
            <p className="text-gray-500">No seats selected</p>
          ) : (
            <div className="space-y-3">
              {selectedSeats.map(seat => (
                <div key={seat.id} className={`p-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                  <div className="font-semibold">{seat.id}</div>
                  <div className="text-sm text-gray-500">
                    Price Tier {seat.priceTier} - ${PRICE_TIERS[seat.priceTier as keyof typeof PRICE_TIERS]?.price}
                  </div>
                </div>
              ))}
              
              <div className={`border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'} pt-4 mt-4`}>
                <div className="flex justify-between items-center text-xl font-bold">
                  <span>Subtotal:</span>
                  <span>${calculateSubtotal()}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedSeats([])}
                className="w-full mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Clear Selection
              </button>
            </div>
          )}

          {focusedSeat && (
            <div className="mt-6">
              <h3 className="font-bold mb-2">Seat Details</h3>
              <div className={`p-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg space-y-1`}>
                <div><strong>ID:</strong> {focusedSeat.id}</div>
                <div><strong>Status:</strong> {focusedSeat.status}</div>
                <div><strong>Price:</strong> ${PRICE_TIERS[focusedSeat.priceTier as keyof typeof PRICE_TIERS]?.price}</div>
                <div><strong>Tier:</strong> {focusedSeat.priceTier}</div>
              </div>
            </div>
          )}

          <div className="mt-6">
            <h3 className="font-bold mb-2">Legend</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span>Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                <span>Reserved</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-500"></div>
                <span>Sold</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}