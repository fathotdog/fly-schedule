import { useQuery } from '@tanstack/react-query';
import { getSpecialRooms } from '@/api/client';
import { useScheduleStore } from '@/store/useScheduleStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function RoomSelector() {
  const { selectedSpecialRoomId, setSelectedSpecialRoomId } = useScheduleStore();

  const { data: rooms = [] } = useQuery({
    queryKey: ['specialRooms'],
    queryFn: getSpecialRooms,
  });

  if (rooms.length === 0) return null;

  const value = selectedSpecialRoomId != null ? String(selectedSpecialRoomId) : 'none';

  return (
    <div className="mt-4">
      <h3 className="font-bold text-xs uppercase tracking-widest text-on-surface-variant mb-2">專科教室（選填）</h3>
      <Select
        value={value}
        onValueChange={(val: string | null) => setSelectedSpecialRoomId(!val || val === 'none' ? null : Number(val))}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="不指定" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">不指定</SelectItem>
          {rooms.map(room => (
            <SelectItem key={room.id} value={String(room.id)}>
              {room.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
