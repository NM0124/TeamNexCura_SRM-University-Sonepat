"""
Interactive Pulse Oximeter Module & Device Adapter Subsystem.
Implements:
  Mode A: High-fidelity simulated oximeter stream with physiological variability,
          plethysmograph signal quality grading, and threshold alarm checking.
  Mode B: Future hardware adapter interface (Bluetooth SIG Pulse Oximeter Service 0x1822)
          clearly separated and labeled for future physical BLE/USB pulse oximeter integration.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from datetime import datetime
import numpy as np
from pydantic import BaseModel, Field


class PulseOximeterPacket(BaseModel):
    patient_id: str
    timestamp: datetime
    spo2_pct: float
    pulse_rate_bpm: int
    signal_quality: str = "optimal"  # optimal, acceptable, marginal, artifact
    perfusion_index: float = 3.2  # %
    device_mode: str = "Mode A: Simulated Stream"
    connection_status: str = "connected"
    is_valid_reading: bool = True
    active_alarms: List[Dict[str, Any]] = Field(default_factory=list)
    provenance: str = "Simulated BLE Pulse Oximeter (Mode A)"


class PulseOximeterThresholds(BaseModel):
    spo2_warning_threshold: float = 94.0  # SpO2 < 94% triggers clinical attention
    spo2_critical_threshold: float = 90.0  # SpO2 < 90% triggers urgent warning
    pulse_rate_high_threshold: int = 110  # Tachycardia threshold
    pulse_rate_low_threshold: int = 50   # Bradycardia threshold


class AbstractPulseOximeterAdapter(ABC):
    """Abstract interface defining required contract for pulse oximeter devices."""

    @abstractmethod
    def connect(self) -> bool:
        pass

    @abstractmethod
    def disconnect(self) -> None:
        pass

    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        pass

    @abstractmethod
    def read_packet(self, patient_id: str) -> Optional[PulseOximeterPacket]:
        pass


class SimulatedPulseOximeterAdapter(AbstractPulseOximeterAdapter):
    """
    Mode A: Generates evolving SpO2 and pulse rate observations with noise,
    motion artifact modeling, and threshold checks.
    """

    def __init__(self, thresholds: Optional[PulseOximeterThresholds] = None, seed: int = 42):
        self.thresholds = thresholds or PulseOximeterThresholds()
        self.rng = np.random.RandomState(seed)
        self.is_connected = True
        self.mode_label = "Mode A: Simulated Oximeter Stream"

    def connect(self) -> bool:
        self.is_connected = True
        return True

    def disconnect(self) -> None:
        self.is_connected = False

    def get_status(self) -> Dict[str, Any]:
        return {
            "mode": "Mode A (Simulated)",
            "connection_status": "connected" if self.is_connected else "disconnected",
            "sampling_frequency_hz": 1.0,
            "provenance": "Synthetic Wearable & IoT Physiological Generator",
            "thresholds": self.thresholds.model_dump(),
        }

    def generate_packet_from_observation(self, obs: Dict[str, Any], patient_id: str) -> PulseOximeterPacket:
        """Adapts an incoming time-series observation into an oximeter packet."""
        raw_spo2 = obs.get("spo2_pct", 98.0)
        raw_hr = obs.get("heart_rate_bpm") or obs.get("pulse_rate_bpm", 75)

        t_val = obs.get("timestamp")
        if isinstance(t_val, str):
            try:
                t_val = datetime.fromisoformat(t_val)
            except Exception:
                t_val = datetime.utcnow()
        elif not isinstance(t_val, datetime):
            t_val = datetime.utcnow()

        # Handle null / missing readings safely
        if raw_spo2 is None or np.isnan(raw_spo2):
            return PulseOximeterPacket(
                patient_id=patient_id,
                timestamp=t_val,
                spo2_pct=0.0,
                pulse_rate_bpm=int(raw_hr) if (raw_hr and not np.isnan(raw_hr)) else 0,
                signal_quality="artifact",
                perfusion_index=0.0,
                device_mode=self.mode_label,
                connection_status="sensor_off_finger",
                is_valid_reading=False,
                active_alarms=[{
                    "severity": "warning",
                    "code": "SENSOR_OFF",
                    "message": "Pulse oximeter signal lost / finger probe dislodged. Saturation unknown."
                }],
                provenance="Simulated BLE Pulse Oximeter [Mode A]"
            )

        spo2 = float(np.clip(raw_spo2, 70.0, 100.0))
        pr = int(np.clip(raw_hr, 30, 220))

        # Check signal quality
        qual = obs.get("signal_quality", "optimal")
        pi = float(obs.get("perfusion_index", round(float(self.rng.uniform(2.2, 4.8)), 1)))

        # Evaluate configurable threshold alarms
        alarms = []
        if spo2 < self.thresholds.spo2_critical_threshold:
            alarms.append({
                "severity": "critical",
                "code": "HYPOXEMIA_CRITICAL",
                "message": f"Critical low oxygen saturation: {spo2:.1f}% (< {self.thresholds.spo2_critical_threshold}% threshold). Airflow obstruction alert."
            })
        elif spo2 < self.thresholds.spo2_warning_threshold:
            alarms.append({
                "severity": "warning",
                "code": "DESATURATION_WARNING",
                "message": f"Mild desaturation detected: {spo2:.1f}% (< {self.thresholds.spo2_warning_threshold}% threshold)."
            })

        if pr > self.thresholds.pulse_rate_high_threshold:
            alarms.append({
                "severity": "warning",
                "code": "TACHYCARDIA",
                "message": f"Elevated pulse rate: {pr} bpm (> {self.thresholds.pulse_rate_high_threshold} bpm)."
            })
        elif pr < self.thresholds.pulse_rate_low_threshold:
            alarms.append({
                "severity": "warning",
                "code": "BRADYCARDIA",
                "message": f"Low pulse rate: {pr} bpm (< {self.thresholds.pulse_rate_low_threshold} bpm)."
            })

        return PulseOximeterPacket(
            patient_id=patient_id,
            timestamp=t_val,
            spo2_pct=round(spo2, 1),
            pulse_rate_bpm=pr,
            signal_quality=qual,
            perfusion_index=pi,
            device_mode=self.mode_label,
            connection_status="connected",
            is_valid_reading=True,
            active_alarms=alarms,
            provenance="Simulated BLE Pulse Oximeter [Mode A]"
        )

    def read_packet(self, patient_id: str) -> Optional[PulseOximeterPacket]:
        # Default fallback reading if called standalone
        return PulseOximeterPacket(
            patient_id=patient_id,
            timestamp=datetime.utcnow(),
            spo2_pct=98.0,
            pulse_rate_bpm=72,
            signal_quality="optimal",
            perfusion_index=3.4,
            device_mode=self.mode_label,
            connection_status="connected",
            provenance="Simulated BLE Pulse Oximeter [Mode A]"
        )


class FutureHardwarePulseOximeterAdapter(AbstractPulseOximeterAdapter):
    """
    Mode B: Future device adapter interface for physical Bluetooth SIG Pulse Oximeters
    (GATT Service 0x1822 / IEEE 11073-10404 standard).
    Provides a clean, pluggable contract for physical BLE pulse oximeter hardware.
    """

    def __init__(self, ble_address: Optional[str] = None):
        self.ble_address = ble_address
        self.is_connected = False
        self.device_model = "Bluetooth Low Energy Pulse Oximeter (Standard GATT 0x1822)"

    def connect(self) -> bool:
        # In software prototype, remains safely unbonded unless physical hardware is detected
        return False

    def disconnect(self) -> None:
        self.is_connected = False

    def get_status(self) -> Dict[str, Any]:
        return {
            "mode": "Mode B (Hardware Adapter Interface)",
            "connection_status": "disconnected",
            "bluetooth_service_uuid": "0x1822",
            "device_address": self.ble_address or "Unassigned (Awaiting Device Binding)",
            "note": "Hardware adapter is declared and ready for BLE integration. No physical sensor currently paired."
        }

    def read_packet(self, patient_id: str) -> Optional[PulseOximeterPacket]:
        # Hardware not connected; safely returns None instead of fabricating sensor data
        return None
