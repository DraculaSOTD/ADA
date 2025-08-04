import subprocess
import os

def predict_data(user_id, model_id):
    # This is a placeholder for the actual prediction script logic
    print(f"Starting prediction for user {user_id} and model {model_id}")
    # Example of how a subprocess call might look
    # cmd = ["python", "path/to/your/prediction_script.py", "--user", str(user_id), "--model", str(model_id)]
    # subprocess.Popen(cmd)
    return f"job_predict_{model_id}"
