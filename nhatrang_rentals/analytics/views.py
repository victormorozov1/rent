import json
import os

from django.conf import settings
from django.http import JsonResponse
from django.utils.timezone import now
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

# Файл лога. Лежит в корне проекта рядом с manage.py
LOG_FILE_PATH = os.path.join(settings.BASE_DIR, "analytics_log.txt")


@csrf_exempt
@require_POST
def track_event(request):
    """
    Принимает JSON:
    {
      "user_id": "...",
      "action_type": "page_view" / "filter_submit" / "favorite_add" / ...,
      "details": {...}
    }

    Пишет строку в analytics_log.txt:
    ISO_TS \t user_id \t action_type \t JSON(details)
    """
    try:
        data = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"status": "error", "error": "invalid_json"}, status=400)

    user_id = str(data.get("user_id") or "anonymous")
    action_type = str(data.get("action_type") or "unknown")
    details = data.get("details") or {}

    timestamp = now().isoformat()

    line = f"{timestamp}\t{user_id}\t{action_type}\t{json.dumps(details, ensure_ascii=False)}\n"

    # Создаём файл, если его ещё нет
    os.makedirs(os.path.dirname(LOG_FILE_PATH), exist_ok=True)
    with open(LOG_FILE_PATH, "a", encoding="utf-8") as f:
        f.write(line)

    return JsonResponse({"status": "ok"})
