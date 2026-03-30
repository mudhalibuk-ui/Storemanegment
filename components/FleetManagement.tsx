
import React, { useState } from 'react';
import { Vehicle, FuelLog, VehicleStatus, User, UserRole, VehicleTrip } from '../types';
import { API } from '../services/api';
import { MapPin, Navigation, Clock, History, Play, Square, CheckCircle2, AlertCircle } from 'lucide-react';

interface FleetManagementProps {
  vehicles: Vehicle[];
  fuelLogs: FuelLog[];
  users: User[];
  currentUser: User;
  onRefresh: () => void;
}

const FleetManagement: React.FC<FleetManagementProps> = ({ vehicles, fuelLogs, users, currentUser, onRefresh }) => {
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [trackingVehicle, setTrackingVehicle] = useState<Vehicle | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Partial<Vehicle> | null>(null);
  const [editingFuel, setEditingFuel] = useState<Partial<FuelLog> | null>(null);
  const [newTrip, setNewTrip] = useState<Partial<VehicleTrip>>({});
  const [loading, setLoading] = useState(false);

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle?.model || !editingVehicle?.licensePlate) return;

    setLoading(true);
    try {
      await API.fleet.saveVehicle({
        ...editingVehicle,
        xarunId: currentUser.xarunId,
        status: editingVehicle.status || VehicleStatus.ACTIVE,
        fuelLevel: editingVehicle.fuelLevel || 100
      });
      setIsVehicleModalOpen(false);
      setEditingVehicle(null);
      onRefresh();
    } catch (error) {
      console.error('Error saving vehicle:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFuel?.vehicleId || !editingFuel?.amount) return;

    setLoading(true);
    try {
      await API.fleet.saveFuelLog({
        ...editingFuel,
        date: editingFuel.date || new Date().toISOString().split('T')[0],
        personnel: currentUser.name
      });
      setIsFuelModalOpen(false);
      setEditingFuel(null);
      onRefresh();
    } catch (error) {
      console.error('Error saving fuel log:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingVehicle || !newTrip.purpose || !newTrip.startLocation) return;

    setLoading(true);
    try {
      const trip: VehicleTrip = {
        id: Math.random().toString(36).substr(2, 9),
        startTime: new Date().toISOString(),
        startLocation: newTrip.startLocation,
        purpose: newTrip.purpose,
        status: 'ONGOING'
      };

      const updatedVehicle = {
        ...trackingVehicle,
        todayTrips: [...(trackingVehicle.todayTrips || []), trip]
      };

      await API.fleet.saveVehicle(updatedVehicle);
      setIsTripModalOpen(false);
      setNewTrip({});
      onRefresh();
    } catch (error) {
      console.error('Error starting trip:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEndTrip = async (vehicle: Vehicle, tripId: string) => {
    setLoading(true);
    try {
      const updatedTrips = (vehicle.todayTrips || []).map(t => 
        t.id === tripId ? { ...t, status: 'COMPLETED' as const, endTime: new Date().toISOString(), endLocation: 'Main Warehouse' } : t
      );

      await API.fleet.saveVehicle({
        ...vehicle,
        todayTrips: updatedTrips
      });
      onRefresh();
    } catch (error) {
      console.error('Error ending trip:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {trackingVehicle ? (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setTrackingVehicle(null)}
              className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all"
            >
              ←
            </button>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-800 uppercase">Live Tracking: {trackingVehicle.model}</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{trackingVehicle.licensePlate}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* MOCK MAP VIEW */}
              <div className="aspect-video bg-slate-100 rounded-[3rem] border border-slate-200 relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                <div className="relative z-10 flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white animate-pulse shadow-2xl shadow-indigo-200">
                    <Navigation size={32} />
                  </div>
                  <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-white shadow-xl text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Location</p>
                    <p className="text-sm font-black text-slate-800">{trackingVehicle.currentLocation?.address || 'Main Warehouse Area'}</p>
                    <p className="text-[9px] font-bold text-indigo-500 mt-1">Last updated: {new Date().toLocaleTimeString()}</p>
                  </div>
                </div>
                {/* Simulated Map Controls */}
                <div className="absolute bottom-6 right-6 flex flex-col gap-2">
                  <button className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center font-bold text-slate-600">+</button>
                  <button className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center font-bold text-slate-600">-</button>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <History size={16} className="text-indigo-500" />
                    Today's Activity
                  </h3>
                  <button 
                    onClick={() => setIsTripModalOpen(true)}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all"
                  >
                    Start New Trip
                  </button>
                </div>

                <div className="space-y-4">
                  {trackingVehicle.todayTrips?.length ? (
                    trackingVehicle.todayTrips.map((trip, idx) => (
                      <div key={trip.id} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${trip.status === 'ONGOING' ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                          {trip.status === 'ONGOING' ? <Navigation size={20} /> : <CheckCircle2 size={20} />}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h5 className="text-xs font-black text-slate-800 uppercase">{trip.purpose}</h5>
                            <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase ${trip.status === 'ONGOING' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                              {trip.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                              <MapPin size={12} />
                              <span>{trip.startLocation} {trip.endLocation ? `→ ${trip.endLocation}` : ''}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                              <Clock size={12} />
                              <span>{new Date(trip.startTime).toLocaleTimeString()} {trip.endTime ? `- ${new Date(trip.endTime).toLocaleTimeString()}` : ''}</span>
                            </div>
                          </div>
                        </div>
                        {trip.status === 'ONGOING' && (
                          <button 
                            onClick={() => handleEndTrip(trackingVehicle, trip.id)}
                            className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all"
                          >
                            End Trip
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No trips recorded today</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-xl shadow-indigo-100">
                <h3 className="text-xs font-black uppercase tracking-widest opacity-80 mb-4">Vehicle Health</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase">
                      <span>Fuel Level</span>
                      <span>{trackingVehicle.fuelLevel}%</span>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white" style={{ width: `${trackingVehicle.fuelLevel}%` }}></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 p-4 rounded-2xl">
                      <p className="text-[8px] font-black uppercase opacity-60">Today's Distance</p>
                      <p className="text-xl font-black">42.5 km</p>
                    </div>
                    <div className="bg-white/10 p-4 rounded-2xl">
                      <p className="text-[8px] font-black uppercase opacity-60">Engine Status</p>
                      <p className="text-xl font-black">Healthy</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">GPRS Diagnostics</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">GPS Signal</span>
                    <span className="text-[10px] font-black text-emerald-600 uppercase">Excellent</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">GPRS Data</span>
                    <span className="text-[10px] font-black text-emerald-600 uppercase">Connected</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Device ID</span>
                    <span className="text-[10px] font-black text-slate-700 uppercase">TRK-9902-X</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-800 uppercase">Fleet Management</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vehicles, Fuel & Maintenance</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setEditingFuel({}); setIsFuelModalOpen(true); }}
                className="bg-white text-slate-800 border border-slate-200 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
              >
                ⛽ Log Fuel
              </button>
              <button
                onClick={() => { setEditingVehicle({}); setIsVehicleModalOpen(true); }}
                className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
              >
                <span>+</span> Add Vehicle
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map(vehicle => (
              <div key={vehicle.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl">🚛</div>
                    <div>
                      <h4 className="font-black text-sm text-slate-800 uppercase tracking-tight">{vehicle.model}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{vehicle.licensePlate}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                    vehicle.status === VehicleStatus.ACTIVE ? 'bg-emerald-100 text-emerald-600' :
                    vehicle.status === VehicleStatus.MAINTENANCE ? 'bg-amber-100 text-amber-600' :
                    'bg-rose-100 text-rose-600'
                  }`}>
                    {vehicle.status}
                  </span>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-50">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-slate-400">Fuel Level</span>
                      <span className={vehicle.fuelLevel < 20 ? 'text-rose-600' : 'text-slate-700'}>{vehicle.fuelLevel}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${vehicle.fuelLevel < 20 ? 'bg-rose-500' : 'bg-indigo-500'}`} 
                        style={{ width: `${vehicle.fuelLevel}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex justify-between text-[10px] font-bold uppercase">
                    <span className="text-slate-400">Assigned Driver</span>
                    <span className="text-slate-700">{vehicle.driverName || 'Unassigned'}</span>
                  </div>
                  
                  {vehicle.currentLocation && (
                    <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded-xl">
                      <MapPin size={12} className="text-indigo-500" />
                      <span className="text-[9px] font-black text-indigo-600 uppercase truncate">{vehicle.currentLocation.address}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <button 
                    onClick={() => setTrackingVehicle(vehicle)}
                    className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1"
                  >
                    <Navigation size={10} /> Track
                  </button>
                  <button 
                    onClick={() => { setEditingVehicle(vehicle); setIsVehicleModalOpen(true); }}
                    className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => { setEditingFuel({ vehicleId: vehicle.id }); setIsFuelModalOpen(true); }}
                    className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors"
                  >
                    Fuel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* TRIP MODAL */}
      {isTripModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Start New Trip</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Log vehicle movement and purpose</p>
              </div>
              <button onClick={() => setIsTripModalOpen(false)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shadow-sm">✕</button>
            </div>

            <form onSubmit={handleStartTrip} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Trip Purpose</label>
                  <input
                    type="text"
                    required
                    value={newTrip.purpose || ''}
                    onChange={e => setNewTrip({ ...newTrip, purpose: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="e.g. Delivery to Branch A"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Starting Location</label>
                  <input
                    type="text"
                    required
                    value={newTrip.startLocation || ''}
                    onChange={e => setNewTrip({ ...newTrip, startLocation: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="e.g. Main Warehouse"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Play size={16} /> {loading ? 'Starting...' : 'Start Trip Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VEHICLE MODAL */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Vehicle Details</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Register or update fleet assets</p>
              </div>
              <button onClick={() => setIsVehicleModalOpen(false)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shadow-sm">✕</button>
            </div>

            <form onSubmit={handleSaveVehicle} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Model / Name</label>
                  <input
                    type="text"
                    required
                    value={editingVehicle?.model || ''}
                    onChange={e => setEditingVehicle({ ...editingVehicle, model: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="e.g. Toyota Hilux 2024"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">License Plate</label>
                  <input
                    type="text"
                    required
                    value={editingVehicle?.licensePlate || ''}
                    onChange={e => setEditingVehicle({ ...editingVehicle, licensePlate: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="e.g. ABC-123"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Status</label>
                  <select
                    value={editingVehicle?.status || VehicleStatus.ACTIVE}
                    onChange={e => setEditingVehicle({ ...editingVehicle, status: e.target.value as VehicleStatus })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    {Object.values(VehicleStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Driver</label>
                  <select
                    value={editingVehicle?.driverId || ''}
                    onChange={e => {
                      const driver = users.find(u => u.id === e.target.value);
                      setEditingVehicle({ ...editingVehicle, driverId: e.target.value, driverName: driver?.name });
                    }}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="">Unassigned</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : editingVehicle?.id ? 'Update Vehicle' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FUEL MODAL */}
      {isFuelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Log Fuel Consumption</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Track fuel costs and efficiency</p>
              </div>
              <button onClick={() => setIsFuelModalOpen(false)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shadow-sm">✕</button>
            </div>

            <form onSubmit={handleSaveFuel} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Select Vehicle</label>
                <select
                  required
                  value={editingFuel?.vehicleId || ''}
                  onChange={e => setEditingFuel({ ...editingFuel, vehicleId: e.target.value })}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.model} ({v.licensePlate})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Amount (Liters)</label>
                  <input
                    type="number"
                    required
                    value={editingFuel?.amount || ''}
                    onChange={e => setEditingFuel({ ...editingFuel, amount: Number(e.target.value) })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Total Cost</label>
                  <input
                    type="number"
                    required
                    value={editingFuel?.cost || ''}
                    onChange={e => setEditingFuel({ ...editingFuel, cost: Number(e.target.value) })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Odometer Reading</label>
                  <input
                    type="number"
                    required
                    value={editingFuel?.odometerReading || ''}
                    onChange={e => setEditingFuel({ ...editingFuel, odometerReading: Number(e.target.value) })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Date</label>
                  <input
                    type="date"
                    required
                    value={editingFuel?.date || ''}
                    onChange={e => setEditingFuel({ ...editingFuel, date: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
                >
                  {loading ? 'Logging...' : 'Save Fuel Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FleetManagement;
