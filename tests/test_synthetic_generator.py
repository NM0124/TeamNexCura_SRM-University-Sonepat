"""
Unit tests for Multi-Patient Synthetic Generator.
Verifies seed reproducibility, distinct phenotypes, and bounds.
"""

from src.simulation.synthetic_patient_generator import SyntheticPatientGenerator


def test_generator_seed_reproducibility():
    gen1 = SyntheticPatientGenerator(n_patients=2, duration_days=3, random_seed=123)
    df1, meta1 = gen1.generate_cohort()

    gen2 = SyntheticPatientGenerator(n_patients=2, duration_days=3, random_seed=123)
    df2, meta2 = gen2.generate_cohort()

    assert df1.equals(df2)
    assert meta1["random_seed"] == 123


def test_generator_produces_distinct_patients():
    gen = SyntheticPatientGenerator(n_patients=3, duration_days=3, random_seed=42)
    df, meta = gen.generate_cohort()

    pids = df["patient_id"].unique()
    assert len(pids) == 3

    # Check distinct baseline phenotypes recorded in metadata
    prof1 = meta["patient_profiles"]["SYNTH_PAT_001"]
    prof2 = meta["patient_profiles"]["SYNTH_PAT_002"]
    assert prof1["baseline_pef"] != prof2["baseline_pef"]

    # Check plausible physiological bounds
    valid_pef = df["peak_flow_pef_l_min"].dropna()
    assert (valid_pef >= 50).all() and (valid_pef <= 900).all()

    valid_spo2 = df["spo2_pct"].dropna()
    assert (valid_spo2 >= 70.0).all() and (valid_spo2 <= 100.0).all()
