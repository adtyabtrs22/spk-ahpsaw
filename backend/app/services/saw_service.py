"""
SAW (Simple Additive Weighting) Service
========================================
Implementasi metode SAW (Fishburn 1967, MacCrimmon 1968)
untuk perangkingan alternatif berdasarkan bobot dari AHP.

Langkah:
1. Menyusun matriks keputusan (X) — nilai setiap alternatif pada setiap sub-kriteria
2. Normalisasi matriks:
   - Benefit: r_ij = x_ij / MAX(kolom j)
   - Cost:    r_ij = MIN(kolom j) / x_ij
3. Menghitung nilai preferensi: V_i = Σ (W_j × R_ij)
4. Perangkingan: urutkan V_i dari terbesar ke terkecil
"""

import numpy as np


def build_decision_matrix(alternatives, subcriteria_ids, scores_data):
    """
    Menyusun matriks keputusan dari data skor.

    Args:
        alternatives: list of alternative IDs
        subcriteria_ids: list of subcriteria IDs
        scores_data: dict of {(alt_id, sub_id): score}

    Returns:
        numpy 2D array (alternatives × subcriteria)
    """
    n_alt = len(alternatives)
    n_sub = len(subcriteria_ids)
    matrix = np.zeros((n_alt, n_sub))

    for i, alt_id in enumerate(alternatives):
        for j, sub_id in enumerate(subcriteria_ids):
            matrix[i][j] = scores_data.get((alt_id, sub_id), 0)

    return matrix


def normalize_saw_matrix(matrix, criteria_types):
    """
    Normalisasi matriks keputusan sesuai tipe kriteria.

    Args:
        matrix: matriks keputusan (numpy 2D array)
        criteria_types: list of "benefit" or "cost" per kolom

    Returns:
        Matriks ternormalisasi (numpy 2D array)
    """
    n_rows, n_cols = matrix.shape
    normalized = np.zeros_like(matrix, dtype=float)

    for j in range(n_cols):
        col = matrix[:, j]
        if criteria_types[j] == "benefit":
            max_val = col.max()
            if max_val > 0:
                normalized[:, j] = col / max_val
            else:
                normalized[:, j] = 0
        else:  # cost
            min_val = col[col > 0].min() if (col > 0).any() else 1
            for i in range(n_rows):
                if col[i] > 0:
                    normalized[i][j] = min_val / col[i]
                else:
                    normalized[i][j] = 0

    return normalized


def calculate_preference_values(normalized_matrix, weights):
    """
    Menghitung nilai preferensi (V_i) untuk setiap alternatif.
    V_i = Σ (W_j × R_ij)

    Args:
        normalized_matrix: matriks ternormalisasi (numpy 2D array)
        weights: numpy 1D array of global weights per sub-kriteria

    Returns:
        numpy 1D array of preference values
    """
    return normalized_matrix @ weights


def calculate_saw_ranking(alternatives, subcriteria_ids, scores_data,
                          criteria_types, global_weights):
    """
    Menjalankan perhitungan SAW lengkap: matriks keputusan → normalisasi → preferensi → ranking.

    Args:
        alternatives: list of alternative IDs
        subcriteria_ids: list of subcriteria IDs (ordered)
        scores_data: {(alt_id, sub_id): score}
        criteria_types: list of "benefit"/"cost" per sub-kriteria
        global_weights: {sub_id: global_weight}

    Returns:
        dict with decision_matrix, normalized_matrix, weighted_scores, preference_values, rankings
    """
    if not alternatives or not subcriteria_ids:
        return {
            "decision_matrix": {},
            "normalized_matrix": {},
            "weighted_scores": {},
            "preference_values": {},
            "rankings": [],
        }

    # 1. Susun matriks keputusan
    decision_matrix = build_decision_matrix(alternatives, subcriteria_ids, scores_data)

    # 2. Normalisasi
    normalized_matrix = normalize_saw_matrix(decision_matrix, criteria_types)

    # 3. Susun vektor bobot global (sesuai urutan subcriteria_ids)
    weight_vector = np.array([global_weights.get(sub_id, 0) for sub_id in subcriteria_ids])

    # 4. Hitung nilai preferensi
    preference_values = calculate_preference_values(normalized_matrix, weight_vector)

    # 5. Hitung weighted scores per sel (W_j × R_ij)
    weighted_matrix = normalized_matrix * weight_vector

    # 6. Ranking (urutkan dari terbesar)
    ranked_indices = np.argsort(-preference_values)

    # Format output
    decision_dict = {}
    normalized_dict = {}
    weighted_dict = {}
    pref_dict = {}
    rankings = []

    for rank_pos, idx in enumerate(ranked_indices):
        alt_id = alternatives[idx]
        pref_val = round(float(preference_values[idx]), 10)
        pref_dict[alt_id] = pref_val

        norm_scores = {}
        w_scores = {}
        dec_scores = {}
        for j, sub_id in enumerate(subcriteria_ids):
            dec_scores[sub_id] = round(float(decision_matrix[idx][j]), 6)
            norm_scores[sub_id] = round(float(normalized_matrix[idx][j]), 10)
            w_scores[sub_id] = round(float(weighted_matrix[idx][j]), 10)

        decision_dict[alt_id] = dec_scores
        normalized_dict[alt_id] = norm_scores
        weighted_dict[alt_id] = w_scores

        rankings.append({
            "alternative_id": alt_id,
            "preference_value": pref_val,
            "rank": rank_pos + 1,
            "normalized_scores": norm_scores,
            "weighted_scores": w_scores,
        })

    return {
        "decision_matrix": decision_dict,
        "normalized_matrix": normalized_dict,
        "weighted_scores": weighted_dict,
        "preference_values": pref_dict,
        "rankings": rankings,
    }
