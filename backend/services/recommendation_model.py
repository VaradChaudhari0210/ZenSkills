import psycopg2
import json
import logging
import sys
import numpy as np
from sklearn.preprocessing import MultiLabelBinarizer, MinMaxScaler
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.ensemble import RandomForestRegressor
import faiss
import pickle
import os

# Configure logging (only INFO and above will be shown)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

DB_CONFIG = {
    "dbname": "postgres",
    "user": "postgres",
    "password": "varad",
    "host": "localhost",
    "port": "5432"
}

def get_role_id_by_user_id(user_id: str, role: str) -> str:
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        if role == 'mentee':
            query = 'SELECT uid FROM "ZenSchema"."mentee" WHERE user_id = %s'
        elif role == 'mentor':
            query = 'SELECT uid FROM "ZenSchema"."mentor" WHERE user_id = %s'
        else:
            raise ValueError("Role must be 'mentee' or 'mentor'.")
        cursor.execute(query, (user_id,))
        result = cursor.fetchone()
        if result:
            return result[0]
        else:
            raise ValueError(f"No {role}_id found for user_id: {user_id}")
    except Exception as e:
        logging.error(f"Error fetching {role}_id: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

def get_language_by_role_id(role_id: str, role: str) -> str:
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        if role == 'mentee':
            query = 'SELECT language FROM "ZenSchema"."User" WHERE id = (SELECT user_id FROM "ZenSchema"."mentee" WHERE id = %s)'
        elif role == 'mentor':
            query = 'SELECT language FROM "ZenSchema"."User" WHERE id = (SELECT user_id FROM "ZenSchema"."mentor" WHERE id = %s)'
        else:
            raise ValueError("Role must be 'mentee' or 'mentor'.")
        cursor.execute(query, (role_id,))
        result = cursor.fetchone()
        if result:
            return result[0]
        else:
            return None
    except Exception as e:
        logging.error(f"Error fetching language for {role} ID {role_id}: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

def get_interests_by_mentee_id(mentee_id: str) -> list:
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        query = """
            SELECT t.tag_name
            FROM "ZenSchema"."tags" t
            JOIN "ZenSchema"."_MenteeTags" mt ON t.tag_id = "mt"."B"
            JOIN "ZenSchema"."mentee" m ON "mt"."A" = m.id
            WHERE m.id = %s
        """
        cursor.execute(query, (mentee_id,))
        interests = cursor.fetchall()
        return [i[0] for i in interests]
    except Exception as e:
        logging.error(f"Error fetching mentee interests: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

def get_expertise_by_mentor_id(mentor_id: str) -> list:
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        query = """
            SELECT t.tag_name
            FROM "ZenSchema"."tags" t
            JOIN "ZenSchema"."_MentorTags" mt ON t.tag_id = "mt"."B"
            JOIN "ZenSchema"."mentor" m ON "mt"."A" = m.id
            WHERE m.id = %s
        """
        cursor.execute(query, (mentor_id,))
        expertise = cursor.fetchall()
        return [e[0] for e in expertise]
    except Exception as e:
        logging.error(f"Error fetching mentor expertise: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

def fetch_all_tags():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        query = 'SELECT tag_id, tag_name FROM "ZenSchema"."tags"'
        cursor.execute(query)
        tag_data = cursor.fetchall()
        return {tag_id: tag_name for tag_id, tag_name in tag_data}
    except Exception as e:
        logging.error(f"Error fetching tags: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

def fetch_mentor_data():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        query = """
            SELECT 
                m.id AS mentor_id, 
                m.experience_years,
                m.rating,
                m.number_of_mentees_mentored,
                m.number_of_sessions,
                ARRAY_AGG(t.tag_name) AS skills,
                u.language as language
            FROM "ZenSchema"."mentor" m
            LEFT JOIN "ZenSchema"."_MentorTags" mt ON m.id = "mt"."A"
            LEFT JOIN "ZenSchema"."tags" t ON "mt"."B" = t.tag_id
            LEFT JOIN "ZenSchema"."User" u ON m.user_id = u.id
            GROUP BY m.id, m.experience_years, m.rating, m.number_of_mentees_mentored, m.number_of_sessions, u.language
        """
        cursor.execute(query)
        mentors = cursor.fetchall()
        result = []
        for mentor_id, exp, rating, num_mentees, num_sessions, skills, language in mentors:
            filtered_skills = [s for s in skills if s is not None] if skills else []
            result.append({
                "mentor_id": mentor_id,
                "experience_years": exp,
                "rating": rating if rating is not None else 0,
                "number_of_mentees_mentored": num_mentees,
                "number_of_sessions": num_sessions,
                "skills": filtered_skills,
                "language": language
            })
        return result
    except Exception as e:
        logging.error(f"Error fetching mentor data: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

def get_session_metrics():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        query = """
            SELECT 
                ms.mentor_id,
                SUM(CASE WHEN sb.status::text = 'completed' THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN sb.status::text != 'available' THEN 1 ELSE 0 END) AS total,
                SUM(CASE WHEN sb.status::text = 'available' THEN 1 ELSE 0 END) AS available
            FROM "ZenSchema"."SessionBooking" sb
            JOIN "ZenSchema"."MentorSession" ms ON sb.session_id = ms.id
            GROUP BY ms.mentor_id
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        metrics = {}
        for mentor_id, completed, total, available in rows:
            metrics[mentor_id] = {
                "completed": completed or 0,
                "total": total or 0,
                "available": available or 0
            }
        return metrics
    except Exception as e:
        logging.error(f"Error fetching session metrics: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

def build_candidate_features(candidate, mlb, mentee_interest_vector, session_metrics, current_language):
    rating = candidate.get("rating", 0)
    num_mentees = candidate.get("number_of_mentees_mentored", 0)
    num_sessions = candidate.get("number_of_sessions", 0)
    
    metrics = session_metrics.get(candidate["mentor_id"], {"completed": 0, "total": 0, "available": 0})
    completed = metrics.get("completed", 0)
    total = metrics.get("total", 0)
    available = metrics.get("available", 0)
    
    session_completion_ratio = completed / total if total > 0 else 0
    mentor_availability = available
    candidate_language = candidate.get("language", None)
    language_feature = 1 if candidate_language and current_language and candidate_language.lower() == current_language.lower() else 0
    
    candidate_skills = candidate.get("skills", [])
    similarity = cosine_similarity(mentee_interest_vector, mlb.transform([candidate_skills]))[0][0]
    
    return [
        rating,
        num_mentees,
        num_sessions,
        session_completion_ratio,
        mentor_availability,
        language_feature,
        similarity
    ]

def get_past_session_tags_by_mentee(mentee_id: str) -> list:
    """
    Fetches distinct expertise tags from mentors whom the mentee has attended completed sessions with.
    """
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        query = """
            SELECT DISTINCT t.tag_name
            FROM "ZenSchema"."MentorSession" ms
            JOIN "ZenSchema"."SessionBooking" sb ON ms.id = sb.session_id
            JOIN "ZenSchema"."_MentorTags" mt ON ms.mentor_id = "mt"."A"
            JOIN "ZenSchema"."tags" t ON "mt"."B" = t.tag_id
            WHERE sb.user_id = (SELECT user_id FROM "ZenSchema"."mentee" WHERE id = %s)
            AND sb.status::text = 'completed'
        """
        cursor.execute(query, (mentee_id,))
        res = cursor.fetchall()
        tags = [r[0] for r in res]
        return list(set(tags))
    except Exception as e:
        logging.error(f"Error fetching past session tags: {e}")
        return []
    finally:
        cursor.close()
        conn.close()

def initialize_rf_model():
    """Initialize and save a new Random Forest model if it doesn't exist"""
    try:
        # Create a basic RF model with default parameters
        rf_model = RandomForestRegressor(
            n_estimators=100,
            random_state=42
        )
        
        # Initialize scaler with default range of values
        scaler = MinMaxScaler()
        # Fit scaler with sample data covering possible ranges
        sample_data = np.array([
            [0, 0, 0, 0],  # min values
            [5, 100, 1000, 1]  # max values: rating, mentees, sessions, completion_ratio
        ])
        scaler.fit(sample_data)
        
        # Save initialized model and fitted scaler
        saved_data = {
            "model": rf_model,
            "scaler": scaler
        }
        
        # Save to a specific directory path
        model_path = os.path.join(os.path.dirname(__file__), "mentor_rf_model.pkl")
        with open(model_path, "wb") as f:
            pickle.dump(saved_data, f)
            
        return saved_data
    except Exception as e:
        logging.error(f"Error initializing RF model: {e}")
        raise

def generate_recommendations_rf(
    input_tags: list,
    role_id: str,
    current_language: str,
    mentee_id: str = None,  # Required if user_type is mentee; used for past session tags
    exclude_current: bool = False
):
    """
    Retrieves candidates from layer-1 (FAISS), then re-ranks them by combining
    the Random Forest predicted score with language match bonus and 
    past session expertise similarity.
    
    Assumes that the RF model was trained on the four features:
        [rating, number_of_mentees_mentored, number_of_sessions, completion_ratio]
    """
    try:
        # Get candidates from FAISS-based retrieval (layer 1)
        all_tags = list(set(fetch_all_tags().values()))
        mentor_list = fetch_mentor_data()
        if exclude_current:
            mentor_list = [mentor for mentor in mentor_list if mentor["mentor_id"] != role_id]
        if not all_tags or not mentor_list:
            return []
        
        # Build a MultiLabelBinarizer for candidate expertise tags
        mlb = MultiLabelBinarizer(classes=all_tags)
        mentor_skills_list = [mentor["skills"] for mentor in mentor_list]
        mlb.fit(mentor_skills_list)
        
        # Encode input expertise (from layer-1) using the same binarizer
        input_encoded = mlb.transform([input_tags]).astype('float32')
        mentor_encoded = mlb.transform(mentor_skills_list).astype('float32')
        
        # Normalize and build FAISS index (using inner product which approximates cosine similarity)
        def safe_normalize(matrix):
            norms = np.linalg.norm(matrix, axis=1, keepdims=True)
            norms[norms == 0] = 1
            return matrix / norms
        
        input_norm = safe_normalize(input_encoded)
        mentor_norm = safe_normalize(mentor_encoded)
        
        d = mentor_norm.shape[1]
        index = faiss.IndexFlatIP(d)
        index.add(mentor_norm)
        D, I = index.search(input_norm, len(mentor_list))
        
        # Filter candidates with a basic similarity threshold (e.g. > 0.6)
        layer1_candidates = []
        for dist, idx in zip(D[0], I[0]):
            if dist > 0.6:
                layer1_candidates.append(mentor_list[idx])
        
        # Load the trained RF model and scaler
        try:
            # Try to load the trained RF model and scaler
            model_path = os.path.join(os.path.dirname(__file__), "mentor_rf_model.pkl")
            with open(model_path, "rb") as f:
                saved_data = pickle.load(f)
            rf_model = saved_data["model"]
            scaler = saved_data["scaler"]
        except FileNotFoundError:
            # If model doesn't exist, initialize a new one
            logging.info("RF model not found. Initializing new model...")
            saved_data = initialize_rf_model()
            rf_model = saved_data["model"]
            scaler = saved_data["scaler"]
        except Exception as e:
            logging.error(f"Error loading RF model: {e}")
            raise
        
        # If the user is a mentee, fetch past session tags
        past_session_tags = []
        if mentee_id is not None:
            past_session_tags = get_past_session_tags_by_mentee(mentee_id)
        
        # Build a binarizer for past session tags if available (use same schema as candidate skills)
        past_mlb = None
        if past_session_tags:
            past_mlb = MultiLabelBinarizer(classes=all_tags)
            past_mlb.fit([past_session_tags])
            past_vector = past_mlb.transform([past_session_tags]).astype('float32')
            past_vector_norm = safe_normalize(past_vector)
        else:
            past_vector_norm = None
        
        recommendations = []
        for candidate in layer1_candidates:
            # Build the RF features vector (same order as training: rating, mentees_mentored, sessions, completion_ratio)
            rf_features = np.array([
                candidate.get("rating", 0),
                candidate.get("number_of_mentees_mentored", 0),
                candidate.get("number_of_sessions", 0),
                # For completion_ratio, you may look up session metrics or set a default (0)
                0  # Replace 0 with a function to calculate candidate's completion_ratio if available
            ]).reshape(1, -1)
            
            # Normalize and predict with the RF model
            rf_features_scaled = scaler.transform(rf_features)
            rf_score = rf_model.predict(rf_features_scaled)[0]
            
            # Language bonus: add a small bonus (e.g., 0.1) if languages match.
            candidate_language = candidate.get("language", "")
            language_bonus = 0.1 if candidate_language and current_language and candidate_language.lower() == current_language.lower() else 0
            
            # Past session similarity: compare candidate skills with past session tags
            past_similarity = 0
            if past_vector_norm is not None:
                candidate_skills = candidate.get("skills", [])
                candidate_vector = mlb.transform([candidate_skills]).astype('float32')
                candidate_vector_norm = safe_normalize(candidate_vector)
                past_similarity = cosine_similarity(past_vector_norm, candidate_vector_norm)[0][0]
            
            # Compute final score by combining RF prediction, language bonus, and past session similarity weight (e.g., 0.5)
            final_score = rf_score + language_bonus + (0.5 * past_similarity)
            
            recommendations.append({
                "mentor_id": candidate["mentor_id"],
                "final_score": final_score,
                "rf_score": float(rf_score),
                "language_bonus": language_bonus,
                "past_similarity": past_similarity
            })
        
        # Sort recommendations by final_score descending
        recommendations.sort(key=lambda x: x["final_score"], reverse=True)
        return recommendations
        
    except Exception as e:
        logging.error(f"Error generating recommendations with RF adjustments: {e}")
        raise

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Invalid usage"}))
        sys.exit(1)
    
    user_type = sys.argv[1]  # 'mentee' or 'mentor'
    user_id = sys.argv[2]
    
    try:
        if user_type == 'mentee':
            mentee_id = get_role_id_by_user_id(user_id, 'mentee')
            mentee_language = get_language_by_role_id(mentee_id, 'mentee')
            interests = get_interests_by_mentee_id(mentee_id)
            recommendations = generate_recommendations_rf(interests, mentee_id, mentee_language, mentee_id=mentee_id)
            print(json.dumps({"recommendations": recommendations}, indent=4))
        elif user_type == 'mentor':
            mentor_id = get_role_id_by_user_id(user_id, 'mentor')
            mentor_language = get_language_by_role_id(mentor_id, 'mentor')
            expertise = get_expertise_by_mentor_id(mentor_id)
            recommendations = generate_recommendations_rf(expertise, mentor_id, mentor_language, exclude_current=True)
            print(json.dumps({"recommendations": recommendations}, indent=4))
        else:
            raise ValueError("Invalid user type. Use 'mentee' or 'mentor'.")
    except Exception as e:
        logging.error(f"Error in main execution: {e}")
        print(json.dumps({"error": str(e)}))
        sys.exit(1)