'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '@/lib/context/LanguageContext';
import { 
  Room, 
  Order,
  listenToRooms, 
  getOrder,
  createRoom,
  updateRoom,
  deleteRoom 
} from '@/lib/firebase/database';
import RoomModal from '@/lib/components/rooms/RoomModal';
import RoomDetailsModal from '@/lib/components/rooms/RoomDetailsModal';
import { 
  Search, 
  Plus, 
  RefreshCw, 
  DoorOpen,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  ShoppingBag,
  MoreVertical
} from 'lucide-react';

type ScreenSize = 'mobile' | 'tablet' | 'desktop';

export default function RoomsPage() {
  const { t, language } = useTranslation();

  const STATUS_CONFIG = {
    available: { label: t.rooms.statusAvailable, color: '#16a34a', bg: '#dcfce7' },
    reserved: { label: t.tables.statusReserved, color: '#f59e0b', bg: '#fef3c7' },
    occupied: { label: t.rooms.statusOccupied, color: '#dc2626', bg: '#fee2e2' },
  };
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomOrders, setRoomOrders] = useState<Record<string, Order>>({});
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Room | null>(null);
  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop');
  
  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterActive, setFilterActive] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = screenSize === 'mobile';
  const isTablet = screenSize === 'tablet';

  // Real-time rooms listener
  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenToRooms(async (roomsData) => {
      setRooms(roomsData);
      
      // Fetch active orders for occupied rooms
      const ordersMap: Record<string, Order> = {};
      await Promise.all(
        roomsData
          .filter(r => r.activeOrderId)
          .map(async (room) => {
            try {
              const order = await getOrder(room.activeOrderId!);
              if (order) {
                ordersMap[room.id] = order;
              }
            } catch (error) {
              console.error('Error fetching order:', error);
            }
          })
      );
      setRoomOrders(ordersMap);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (filterStatus !== 'all' && room.status !== filterStatus) {
        return false;
      }
      
      if (filterActive !== 'all') {
        const isActive = room.isActive !== false;
        if (filterActive === 'active' && !isActive) return false;
        if (filterActive === 'inactive' && isActive) return false;
      }
      
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const roomNumber = String(room.roomNumber).toLowerCase();
        const roomName = (room.name || '').toLowerCase();
        if (!roomNumber.includes(searchLower) && !roomName.includes(searchLower)) {
          return false;
        }
      }
      
      return true;
    });
  }, [rooms, filterStatus, filterActive, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const activeRooms = rooms.filter(r => r.isActive !== false);
    return {
      total: activeRooms.length,
      available: activeRooms.filter(r => r.status === 'available').length,
      reserved: activeRooms.filter(r => r.status === 'reserved').length,
      occupied: activeRooms.filter(r => r.status === 'occupied').length,
    };
  }, [rooms]);

  const handleSaveRoom = async (data: Partial<Room>) => {
    if (editRoom) {
      await updateRoom(editRoom.id, data);
    } else {
      await createRoom(data as Omit<Room, 'id'>);
    }
    setEditRoom(null);
    setShowAddModal(false);
  };

  const handleDeleteRoom = async (room: Room) => {
    if (room.activeOrderId) {
      alert(t.rooms.cannotDeleteActive);
      return;
    }
    
    await deleteRoom(room.id);
    setShowDeleteConfirm(null);
  };

  const handleToggleActive = async (room: Room) => {
    if (room.activeOrderId) {
      alert(t.rooms.cannotDeactivateActive);
      return;
    }
    await updateRoom(room.id, { isActive: !room.isActive });
  };

  const getTimeSinceOpened = (room: Room, order?: Order) => {
    if (!room.reservedAt && !order?.createdAt) return null;
    
    const startTime = new Date(order?.createdAt || room.reservedAt || '').getTime();
    const now = Date.now();
    const diffMinutes = Math.floor((now - startTime) / 60000);
    
    if (diffMinutes < 60) {
      return `${diffMinutes} د`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      return `${hours}س`;
    }
  };

  return (
    <div style={{ padding: isMobile ? '16px' : isTablet ? '20px' : '24px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? '12px' : '0',
        marginBottom: isMobile ? '16px' : '24px',
      }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            {t.rooms.title}
          </h1>
          <p style={{ fontSize: isMobile ? '12px' : '14px', color: '#64748b', marginTop: '4px' }}>
            {t.rooms.subtitle}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: isMobile ? '10px 16px' : '10px 20px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            border: 'none',
            borderRadius: '12px',
            fontSize: isMobile ? '13px' : '14px',
            fontWeight: 600,
            color: '#ffffff',
            cursor: 'pointer',
          }}
        >
          <Plus style={{ width: '18px', height: '18px' }} />
          {t.rooms.addRoom}
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: isMobile ? '10px' : '16px',
        marginBottom: isMobile ? '16px' : '24px',
      }}>
        <div style={{
          padding: isMobile ? '14px' : '20px',
          backgroundColor: '#ffffff',
          borderRadius: isMobile ? '12px' : '16px',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '12px' }}>
            <div style={{
              width: isMobile ? '36px' : '44px',
              height: isMobile ? '36px' : '44px',
              borderRadius: '12px',
              backgroundColor: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <DoorOpen style={{ width: isMobile ? '18px' : '22px', height: isMobile ? '18px' : '22px', color: '#64748b' }} />
            </div>
            <div>
              <p style={{ fontSize: isMobile ? '10px' : '12px', color: '#64748b', marginBottom: '2px' }}>{t.rooms.totalRooms}</p>
              <p style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{stats.total}</p>
            </div>
          </div>
        </div>
        <div style={{
          padding: isMobile ? '14px' : '20px',
          backgroundColor: '#f0fdf4',
          borderRadius: isMobile ? '12px' : '16px',
          border: '1px solid #16a34a',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '12px' }}>
            <div style={{
              width: isMobile ? '36px' : '44px',
              height: isMobile ? '36px' : '44px',
              borderRadius: '12px',
              backgroundColor: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CheckCircle style={{ width: isMobile ? '18px' : '22px', height: isMobile ? '18px' : '22px', color: '#16a34a' }} />
            </div>
            <div>
              <p style={{ fontSize: isMobile ? '10px' : '12px', color: '#16a34a', marginBottom: '2px' }}>{t.rooms.statusAvailable}</p>
              <p style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700, color: '#16a34a', margin: 0 }}>{stats.available}</p>
            </div>
          </div>
        </div>
        <div style={{
          padding: isMobile ? '14px' : '20px',
          backgroundColor: '#fef3c7',
          borderRadius: isMobile ? '12px' : '16px',
          border: '1px solid #f59e0b',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '12px' }}>
            <div style={{
              width: isMobile ? '36px' : '44px',
              height: isMobile ? '36px' : '44px',
              borderRadius: '12px',
              backgroundColor: '#fde68a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <AlertCircle style={{ width: isMobile ? '18px' : '22px', height: isMobile ? '18px' : '22px', color: '#f59e0b' }} />
            </div>
            <div>
              <p style={{ fontSize: isMobile ? '10px' : '12px', color: '#f59e0b', marginBottom: '2px' }}>{t.tables.statusReserved}</p>
              <p style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700, color: '#f59e0b', margin: 0 }}>{stats.reserved}</p>
            </div>
          </div>
        </div>
        <div style={{
          padding: isMobile ? '14px' : '20px',
          backgroundColor: '#fee2e2',
          borderRadius: isMobile ? '12px' : '16px',
          border: '1px solid #dc2626',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '12px' }}>
            <div style={{
              width: isMobile ? '36px' : '44px',
              height: isMobile ? '36px' : '44px',
              borderRadius: '12px',
              backgroundColor: '#fecaca',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <XCircle style={{ width: isMobile ? '18px' : '22px', height: isMobile ? '18px' : '22px', color: '#dc2626' }} />
            </div>
            <div>
              <p style={{ fontSize: isMobile ? '10px' : '12px', color: '#dc2626', marginBottom: '2px' }}>{t.rooms.statusOccupied}</p>
              <p style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700, color: '#dc2626', margin: 0 }}>{stats.occupied}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: isMobile ? '12px' : '16px',
        border: '1px solid #e2e8f0',
        padding: isMobile ? '12px' : '20px',
        marginBottom: isMobile ? '16px' : '24px',
      }}>
        <div style={{
          display: 'flex',
          gap: isMobile ? '10px' : '16px',
          flexDirection: isMobile ? 'column' : 'row',
          flexWrap: 'wrap',
          alignItems: isMobile ? 'stretch' : 'center',
        }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: isMobile ? '100%' : '200px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '0 14px',
              height: isMobile ? '40px' : '44px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
            }}>
              <Search style={{ width: '18px', height: '18px', color: '#94a3b8' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t.rooms.searchPlaceholder}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: isMobile ? '13px' : '14px',
                  color: '#0f172a',
                  backgroundColor: 'transparent',
                }}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div style={{ 
            display: 'flex', 
            gap: '8px',
            overflowX: 'auto',
            minWidth: isMobile ? '100%' : 'auto',
            paddingBottom: isMobile ? '4px' : '0',
          }}>
            {[
              { value: 'all', label: t.common.all, color: '#64748b' },
              { value: 'available', label: t.rooms.statusAvailable, color: '#16a34a' },
              { value: 'reserved', label: t.tables.statusReserved, color: '#f59e0b' },
              { value: 'occupied', label: t.rooms.statusOccupied, color: '#dc2626' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFilterStatus(option.value)}
                style={{
                  padding: isMobile ? '6px 12px' : '8px 14px',
                  borderRadius: '10px',
                  border: filterStatus === option.value 
                    ? `2px solid ${option.color}` 
                    : '1px solid #e2e8f0',
                  fontSize: isMobile ? '12px' : '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: filterStatus === option.value ? `${option.color}20` : '#ffffff',
                  color: filterStatus === option.value ? option.color : '#475569',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Active Filter */}
          <div style={{ 
            display: 'flex', 
            gap: '8px',
            overflowX: 'auto',
            minWidth: isMobile ? '100%' : 'auto',
            paddingBottom: isMobile ? '4px' : '0',
          }}>
            {[
              { value: 'all', label: t.common.all },
              { value: 'active', label: t.common.active },
              { value: 'inactive', label: t.common.inactive },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFilterActive(option.value)}
                style={{
                  padding: isMobile ? '6px 12px' : '8px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: isMobile ? '12px' : '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: filterActive === option.value ? '#6366f1' : '#f1f5f9',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  color: filterActive === option.value ? '#ffffff' : '#475569',
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rooms Table */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: isMobile ? '12px' : '16px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #e2e8f0',
              borderTopColor: '#f59e0b',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
          </div>
        ) : filteredRooms.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '80px',
          }}>
            <DoorOpen style={{ width: '48px', height: '48px', color: '#cbd5e1', marginBottom: '16px' }} />
            <p style={{ fontSize: '16px', color: '#475569', marginBottom: '8px' }}>
              {searchTerm || filterStatus !== 'all' || filterActive !== 'all' 
                ? t.rooms.noRoomsMatch 
                : t.rooms.noRooms}
            </p>
          </div>
        ) : isMobile || isTablet ? (
          /* Mobile/Tablet Card View */
          <div style={{ padding: '12px' }}>
            {filteredRooms.map((room) => {
              const statusConfig = STATUS_CONFIG[room.status] || STATUS_CONFIG.available;
              const activeOrder = roomOrders[room.id];
              const isInactive = room.isActive === false;

              return (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  style={{
                    padding: '14px',
                    marginBottom: '10px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: isInactive ? '#f8fafc' : '#ffffff',
                    opacity: isInactive ? 0.6 : 1,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: room.status === 'available' ? '#dcfce7' : room.status === 'reserved' ? '#fef3c7' : '#fee2e2',
                        color: statusConfig.color,
                        fontWeight: 700,
                        fontSize: '14px',
                      }}>
                        {room.roomNumber}
                      </div>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                          {room.name || `${t.cashier.room} ${room.roomNumber}`}
                        </p>
                        <span style={{
                          display: 'inline-flex',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '10px',
                          fontWeight: 600,
                          backgroundColor: statusConfig.bg,
                          color: statusConfig.color,
                          marginTop: '4px',
                        }}>
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedRoom(room); }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#f8fafc',
                        fontSize: '12px',
                        color: '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      {t.common.details}
                    </button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                    <span>
                      {room.priceType === 'free' ? (language === 'ar' ? 'مجاني' : 'Free') : 
                       room.hourlyRate ? `${room.hourlyRate} ${t.rooms.hourlyRate}` : '-'}
                    </span>
                    {activeOrder && (
                      <span style={{ color: '#6366f1', fontWeight: 600 }}>
                        {t.rooms.order}: {activeOrder.total.toFixed(2)} {t.common.currency}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {/* Table Header - Desktop Only */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr 100px 100px 120px 140px 100px',
              gap: '12px',
              padding: '14px 20px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              fontSize: '12px',
              fontWeight: 600,
              color: '#64748b',
            }}>
              <div>{t.rooms.number}</div>
              <div>{t.common.name}</div>
              <div style={{ textAlign: 'center' }}>{t.rooms.capacity}</div>
              <div style={{ textAlign: 'center' }}>{t.common.status}</div>
              <div style={{ textAlign: 'center' }}>{t.rooms.currentOrder}</div>
              <div style={{ textAlign: 'center' }}>{t.rooms.duration}</div>
              <div style={{ textAlign: 'center' }}>{t.common.actions}</div>
            </div>

            {/* Table Body - Desktop Only */}
            {filteredRooms.map((room) => {
              const statusConfig = STATUS_CONFIG[room.status] || STATUS_CONFIG.available;
              const activeOrder = roomOrders[room.id];
              const isInactive = room.isActive === false;

              return (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr 100px 100px 120px 140px 100px',
                    gap: '12px',
                    padding: '16px 20px',
                    borderBottom: '1px solid #f1f5f9',
                    alignItems: 'center',
                    cursor: 'pointer',
                    opacity: isInactive ? 0.5 : 1,
                    backgroundColor: isInactive ? '#f8fafc' : 'transparent',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseOver={(e) => !isInactive && (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseOut={(e) => !isInactive && (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {/* Room Number */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: room.status === 'available' ? '#dcfce7' : room.status === 'reserved' ? '#fef3c7' : '#fee2e2',
                    color: statusConfig.color,
                    fontWeight: 700,
                    fontSize: '16px',
                  }}>
                    {room.roomNumber}
                  </div>

                  {/* Name */}
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                      {room.name || `${t.cashier.room} ${room.roomNumber}`}
                    </p>
                    {room.notes && (
                      <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                        {room.notes.slice(0, 30)}{room.notes.length > 30 ? '...' : ''}
                      </p>
                    )}
                  </div>

                  {/* Pricing */}
                  <div style={{ textAlign: 'center' }}>
                    {room.priceType === 'free' ? (
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#22c55e' }}>{language === 'ar' ? 'مجاني' : 'Free'}</span>
                    ) : room.priceType === 'gender' ? (
                      <div style={{ fontSize: '11px' }}>
                        <div style={{ color: '#3b82f6' }}>🚹 {room.malePrice || 3} {t.common.currency}</div>
                        <div style={{ color: '#ec4899' }}>🚺 {room.femalePrice === 0 ? (language === 'ar' ? 'مجاني' : 'Free') : `${room.femalePrice} ${t.common.currency}`}</div>
                      </div>
                    ) : room.hourlyRate && room.hourlyRate > 0 ? (
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#f59e0b' }}>{room.hourlyRate} {t.rooms.hourlyRate}</span>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>-</span>
                    )}
                  </div>

                  {/* Status */}
                  <div style={{ textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-flex',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: statusConfig.bg,
                      color: statusConfig.color,
                    }}>
                      {statusConfig.label}
                    </span>
                  </div>

                  {/* Active Order */}
                  <div style={{ textAlign: 'center' }}>
                    {activeOrder ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ShoppingBag style={{ width: '14px', height: '14px', color: '#6366f1' }} />
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#6366f1' }}>
                            {activeOrder.total.toFixed(2)}
                          </span>
                        </div>
                        {/* عرض جنس الحاجز */}
                        {(activeOrder as any).roomGender && (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            backgroundColor: (activeOrder as any).roomGender === 'male' ? '#dbeafe' : '#fce7f3',
                            color: (activeOrder as any).roomGender === 'male' ? '#1d4ed8' : '#be185d',
                          }}>
                            {(activeOrder as any).roomGender === 'male' ? `👦 ${t.rooms.male}` : `👧 ${t.rooms.female}`}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>-</span>
                    )}
                  </div>

                  {/* Time */}
                  <div style={{ textAlign: 'center' }}>
                    {getTimeSinceOpened(room, activeOrder) ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <Clock style={{ width: '14px', height: '14px', color: '#64748b' }} />
                        <span style={{ fontSize: '12px', color: '#475569' }}>
                          {getTimeSinceOpened(room, activeOrder)}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>-</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div 
                    style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setEditRoom(room)}
                      style={{
                        padding: '8px',
                        backgroundColor: '#f1f5f9',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        color: '#475569',
                      }}
                      title={t.common.edit}
                    >
                      <Edit style={{ width: '14px', height: '14px' }} />
                    </button>
                    <button
                      onClick={() => handleToggleActive(room)}
                      style={{
                        padding: '8px',
                        backgroundColor: room.isActive === false ? '#dcfce7' : '#fef3c7',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        color: room.isActive === false ? '#16a34a' : '#f59e0b',
                      }}
                      title={room.isActive === false ? t.rooms.activate : t.rooms.deactivate}
                    >
                      {room.isActive === false ? (
                        <Eye style={{ width: '14px', height: '14px' }} />
                      ) : (
                        <EyeOff style={{ width: '14px', height: '14px' }} />
                      )}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(room)}
                      disabled={!!room.activeOrderId}
                      style={{
                        padding: '8px',
                        backgroundColor: room.activeOrderId ? '#f1f5f9' : '#fee2e2',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: room.activeOrderId ? 'not-allowed' : 'pointer',
                        color: room.activeOrderId ? '#cbd5e1' : '#dc2626',
                      }}
                      title={room.activeOrderId ? t.rooms.cannotDeleteActive : t.common.delete}
                    >
                      <Trash2 style={{ width: '14px', height: '14px' }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Room Details Modal */}
      {selectedRoom && (
        <RoomDetailsModal
          room={selectedRoom}
          activeOrder={roomOrders[selectedRoom.id]}
          onClose={() => setSelectedRoom(null)}
          onStatusChange={() => {}}
        />
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editRoom) && (
        <RoomModal
          room={editRoom}
          existingRooms={rooms}
          onClose={() => {
            setShowAddModal(false);
            setEditRoom(null);
          }}
          onSave={handleSaveRoom}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <>
          <div
            onClick={() => setShowDeleteConfirm(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 100,
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '400px',
            maxWidth: '95vw',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '24px',
            zIndex: 101,
            textAlign: 'center',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Trash2 style={{ width: '28px', height: '28px', color: '#dc2626' }} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              {t.rooms.deleteRoom}
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
              {t.rooms.confirmDeleteRoom} "{showDeleteConfirm.name || `${t.cashier.room} ${showDeleteConfirm.roomNumber}`}"?
              <br />
              <span style={{ color: '#dc2626' }}>{t.rooms.irreversible}</span>
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => handleDeleteRoom(showDeleteConfirm)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#dc2626',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                {t.rooms.yesDelete}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                {t.common.cancel}
              </button>
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}



