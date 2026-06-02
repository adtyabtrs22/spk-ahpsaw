"""
AHP (Analytical Hierarchy Process) Service
==========================================
Implementasi metode AHP sesuai Prof. Thomas L. Saaty (1980)
untuk pembobotan kriteria dan sub-kriteria.

Langkah:
1. Membuat matriks perbandingan berpasangan (pairwise comparison)
2. Normalisasi matriks (membagi setiap elemen dengan jumlah kolomnya)
3. Menghitung eigen vektor (rata-rata baris = bobot prioritas)
4. Uji konsistensi (λmax → CI → CR)
5. Menghitung bobot global (bobot kriteria × bobot lokal sub-kriteria)
"""

import numpy as np
from app.config import RI_TABLE


def build_pairwise_matrix(items, pairwise_entries):
    """
    Menyusun matriks perbandingan berpasangan dari entri database.

    Args:
        items: list of item IDs (criteria or subcriteria)
        pairwise_entries: list of (row_id, col_id, value) tuples

    Returns:
        numpy 2D array representing the pairwise comparison matrix
    """
    n = len(items)
    matrix = np.ones((n, n))
    id_to_idx = {item_id: idx for idx, item_id in enumerate(items)}

    for row_id, col_id, value in pairwise_entries:
        i = id_to_idx.get(row_id)
        j = id_to_idx.get(col_id)
        if i is not None and j is not None:
            matrix[i][j] = value
            matrix[j][i] = 1.0 / value  # Resiprokal

    return matrix


def normalize_matrix(matrix):
    """
    Normalisasi matriks perbandingan berpasangan.
    Setiap elemen dibagi dengan jumlah kolomnya.

    Returns:
        Matriks ternormalisasi (numpy 2D array)
    """
    col_sums = matrix.sum(axis=0)
    # Hindari division by zero
    col_sums[col_sums == 0] = 1
    return matrix / col_sums


def calculate_priority_vector(normalized_matrix):
    """
    Menghitung vektor prioritas (eigen vektor) dari matriks normalisasi.
    Bobot = rata-rata setiap baris dari matriks normalisasi.

    Returns:
        numpy 1D array of weights (eigen vektor)
    """
    return normalized_matrix.mean(axis=1)


def calculate_consistency(matrix, weights):
    """
    Menghitung konsistensi matriks perbandingan berpasangan.

    Langkah:
    1. λmax = jumlah dari (jumlah kolom matriks awal × bobot)
    2. CI = (λmax - n) / (n - 1)
    3. CR = CI / RI

    Args:
        matrix: matriks perbandingan berpasangan (numpy 2D array)
        weights: vektor prioritas (numpy 1D array)

    Returns:
        dict with lambda_max, ci, ri, cr, is_consistent
    """
    n = len(weights)

    if n <= 2:
        return {
            "lambda_max": float(n),
            "ci": 0.0,
            "ri": 0.0,
            "cr": 0.0,
            "is_consistent": True,
        }

    # Hitung weighted sum vector: A × w
    weighted_sum = matrix @ weights

    # Hitung λmax: rata-rata dari (weighted_sum / weights)
    lambda_max = float(np.mean(weighted_sum / weights))

    # Consistency Index
    ci = (lambda_max - n) / (n - 1)

    # Random Index (tabel Saaty)
    ri = RI_TABLE.get(n, 1.49)

    # Consistency Ratio
    cr = ci / ri if ri > 0 else 0.0

    return {
        "lambda_max": round(lambda_max, 6),
        "ci": round(ci, 6),
        "ri": ri,
        "cr": round(cr, 6),
        "is_consistent": cr <= 0.1,
    }


def calculate_ahp_weights(items, pairwise_entries):
    """
    Menjalankan perhitungan AHP lengkap: matriks → normalisasi → bobot → konsistensi.

    Args:
        items: list of item IDs
        pairwise_entries: list of (row_id, col_id, value) tuples

    Returns:
        dict with:
            - weights: {item_id: weight_value}
            - consistency: {lambda_max, ci, ri, cr, is_consistent}
            - pairwise_matrix: 2D list
            - normalized_matrix: 2D list
    """
    if len(items) < 2:
        if len(items) == 1:
            return {
                "weights": {items[0]: 1.0},
                "consistency": {
                    "lambda_max": 1.0, "ci": 0.0, "ri": 0.0,
                    "cr": 0.0, "is_consistent": True,
                },
                "pairwise_matrix": [[1.0]],
                "normalized_matrix": [[1.0]],
            }
        return {
            "weights": {},
            "consistency": {
                "lambda_max": 0.0, "ci": 0.0, "ri": 0.0,
                "cr": 0.0, "is_consistent": True,
            },
            "pairwise_matrix": [],
            "normalized_matrix": [],
        }

    # 1. Bangun matriks perbandingan berpasangan
    matrix = build_pairwise_matrix(items, pairwise_entries)

    # 2. Normalisasi matriks
    norm_matrix = normalize_matrix(matrix)

    # 3. Hitung vektor prioritas (bobot)
    weights = calculate_priority_vector(norm_matrix)

    # 4. Uji konsistensi
    consistency = calculate_consistency(matrix, weights)

    # Mapping ke item IDs
    weight_dict = {items[i]: round(float(weights[i]), 10) for i in range(len(items))}

    return {
        "weights": weight_dict,
        "consistency": consistency,
        "pairwise_matrix": matrix.tolist(),
        "normalized_matrix": norm_matrix.tolist(),
    }


def calculate_global_weights(criteria_weights, subcriteria_weights_by_criteria):
    """
    Menghitung bobot global = bobot kriteria × bobot lokal sub-kriteria.

    Args:
        criteria_weights: {criteria_id: weight}
        subcriteria_weights_by_criteria: {criteria_id: {subcriteria_id: local_weight}}

    Returns:
        {subcriteria_id: global_weight}
    """
    global_weights = {}
    for crit_id, crit_weight in criteria_weights.items():
        sub_weights = subcriteria_weights_by_criteria.get(crit_id, {})
        for sub_id, local_weight in sub_weights.items():
            global_weights[sub_id] = round(crit_weight * local_weight, 10)
    return global_weights
