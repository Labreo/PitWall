from pydantic import BaseModel
from typing import Optional

class RawTelemetryPoint(BaseModel):
    timestamp_ms: int
    gps_lat: Optional[float] = None
    gps_lon: Optional[float] = None
    gps_speed_ms: Optional[float] = None
    accel_x: Optional[float] = None
    accel_y: Optional[float] = None
    accel_z: Optional[float] = None
    gyro_x: Optional[float] = None
    gyro_y: Optional[float] = None
    gyro_z: Optional[float] = None
