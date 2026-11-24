import { describe, expect, it } from "vitest";
import { bookingSchema, entitySchemas, profileSchema, registerSchema } from "../lib/validation";
import { bookable, dateKey, timeLabel, addDays } from "../lib/utils";
import { demoSchedules } from "../lib/demo";
const id="10000000-0000-4000-8000-000000000001";
const another="10000000-0000-4000-8000-000000000002";
describe("trust boundaries",()=>{
  const registration={full_name:"Mahasiswa Uji",nim:"09011282628001",email:"uji@example.com",password:"Testing123!",consent:true};
  it("rejects privilege injection at registration",()=>{
    expect(registerSchema.safeParse(registration).success).toBe(true);
    expect(registerSchema.safeParse({...registration,role:"admin"}).success).toBe(false);
    expect(registerSchema.safeParse({...registration,consent:false}).success).toBe(false);
  });
  it("does not allow profile updates to change identity or role",()=>{
    const profile={full_name:"Mahasiswa Uji",phone:"+62 812 0000",faculty:"Fasilkom",program:"Sistem Informasi"};
    expect(profileSchema.safeParse(profile).success).toBe(true);
    for(const field of ["role","nim","id","status","email"])expect(profileSchema.safeParse({...profile,[field]:"changed"}).success).toBe(false);
  });
  it("requires distinct valid pickup and dropoff UUIDs",()=>{
    const b={schedule_id:id,seat_id:another,pickup_stop_id:id,dropoff_stop_id:another};
    expect(bookingSchema.safeParse(b).success).toBe(true);
    expect(bookingSchema.safeParse({...b,dropoff_stop_id:id}).success).toBe(false);
    expect(bookingSchema.safeParse({...b,student_id:another}).success).toBe(false);
  });
  it("rejects duplicate stops and invalid bus capacity",()=>{
    expect(entitySchemas.route.safeParse({name:"Rute uji",origin:"Indralaya",destination:"Palembang",stops:[{stop_id:id,pickup_allowed:true,dropoff_allowed:false},{stop_id:id,pickup_allowed:false,dropoff_allowed:true}]}).success).toBe(false);
    expect(entitySchemas.bus.safeParse({code:"UB-01",name:"Bus uji",plate_number:"BG 123",capacity:61,status:"operating"}).success).toBe(false);
  });
});
describe("WIB booking boundaries",()=>{
  it("produces valid demo timestamps for single-digit departure hours",()=>{
    for(const schedule of demoSchedules()){
      expect(Number.isFinite(Date.parse(schedule.departure_at))).toBe(true);
      expect(Number.isFinite(Date.parse(schedule.arrival_at))).toBe(true);
      expect(()=>dateKey(schedule.departure_at)).not.toThrow();
    }
  });
  const now=Date.parse("2026-10-20T00:00:00Z");
  const s={status:"scheduled",available:1,departure_at:"2026-10-20T00:30:01Z"};
  it("closes exactly 30 minutes before departure",()=>{
    expect(bookable(s,now)).toBe(true);
    expect(bookable({...s,departure_at:"2026-10-20T00:30:00Z"},now)).toBe(false);
  });
  it("rejects full, cancelled, boarding, and past trips",()=>{
    expect(bookable({...s,available:0},now)).toBe(false);
    for(const status of ["cancelled","boarding","departed","completed"])expect(bookable({...s,status},now)).toBe(false);
    expect(bookable({...s,departure_at:"2026-10-19T20:00:00Z"},now)).toBe(false);
  });
  it("uses Jakarta calendar dates across UTC midnight",()=>{
    expect(dateKey("2026-10-20T18:00:00Z")).toBe("2026-10-21");
    expect(timeLabel("2026-10-20T18:00:00Z")).toBe("01:00");
    expect(addDays("2026-12-31",1)).toBe("2027-01-01");
  });
});
