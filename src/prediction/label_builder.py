"""
Future Deterioration Event Label Builder.
Constructs forward-looking ground truth targets strictly from subsequent observations
within the prediction horizon (t_pred < t <= t_pred + H).
Never allows future values or labels to leak into current features.
"""

from typing import Dict, Any, Tuple
from datetime import datetime, timedelta
import pandas as pd
import numpy as np


class LabelBuilder:
    def __init__(
        self,
        horizon_hours: int = 6,
        pef_threshold_pct: float = 0.80,
        consecutive_readings: int = 2
    ):
        self.horizon_hours = horizon_hours
        self.pef_threshold_pct = pef_threshold_pct
        self.consecutive_readings = consecutive_readings

    def build_labels(
        self,
        df: pd.DataFrame,
        pef_reference_col: str = "pef_reference"
    ) -> pd.DataFrame:
        """
        Derives future PEF deterioration labels for each row i.
        Event occurs if at least `consecutive_readings` future observations within `horizon_hours`
        have PEF < (pef_threshold_pct * reference_value).
        """
        df_work = df.copy()
        if "parsed_timestamp" not in df_work.columns:
            df_work["parsed_timestamp"] = pd.to_datetime(df_work["timestamp"])
        df_work = df_work.sort_values(by="parsed_timestamp").reset_index(drop=True)

        n = len(df_work)
        labels = np.zeros(n, dtype=int)
        pef_vals = df_work["peak_flow_pef_l_min"].values
        timestamps = df_work["parsed_timestamp"].values

        # If reference not in df, use overall 85th percentile as stable reference estimate
        if pef_reference_col in df_work.columns:
            refs = df_work[pef_reference_col].values
        else:
            # High stable reference estimate (e.g., patient personal best ~450 L/min)
            refs = np.full(n, np.quantile(pef_vals, 0.85))

        for i in range(n):
            t_curr = pd.to_datetime(timestamps[i])
            t_horizon = t_curr + pd.Timedelta(hours=self.horizon_hours)

            # Look strictly forward: t_curr < t <= t_horizon
            future_mask = (timestamps > timestamps[i]) & (timestamps <= np.datetime64(t_horizon))
            future_pefs = pef_vals[future_mask]
            curr_ref = refs[i]
            threshold = curr_ref * self.pef_threshold_pct

            # Check consecutive condition
            consec = 0
            event = 0
            for pef in future_pefs:
                if pef < threshold:
                    consec += 1
                    if consec >= self.consecutive_readings:
                        event = 1
                        break
                else:
                    consec = 0
            labels[i] = event

        # Observations too close to the end of the series cannot evaluate the full horizon
        max_time = pd.to_datetime(timestamps[-1])
        valid_eval_mask = (pd.to_datetime(timestamps) + pd.Timedelta(hours=self.horizon_hours)) <= max_time

        df_work["future_pef_deterioration_label"] = labels
        df_work["is_label_evaluable"] = valid_eval_mask

        return df_work
