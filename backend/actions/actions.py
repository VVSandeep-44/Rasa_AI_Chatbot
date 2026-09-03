# This files contains your custom actions which can be used to run
# custom Python code.
#
# See this guide on how to implement these action:
# https://rasa.com/docs/rasa/custom-actions


# Simple custom actions for anime replies and GPT-backed answers.

import os
from typing import Any, Text, Dict, List

import requests

from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher


class ActionAnswer(Action):

    def name(self) -> Text:
        return "action_answer"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:

        user_question = tracker.latest_message.get('text')

        print(f"User asked: {user_question}")

        url = "https://chatgpt-42.p.rapidapi.com/conversationgpt4-2"

        payload = {
            "messages": [
                {
                    "role": "user",
                    "content": user_question,
                }
            ],
            "system_prompt": "You are a helpful assistant. Give clear and concise answers.",
            "temperature": 0.9,
            "top_k": 5,
            "top_p": 0.9,
            "max_tokens": 256,
            "web_access": False,
        }

        rapidapi_key = os.getenv("RAPIDAPI_KEY")
        if not rapidapi_key:
            dispatcher.utter_message(
                text="The AI service is not configured. Please set RAPIDAPI_KEY."
            )
            return []

        headers = {
            "x-rapidapi-key": rapidapi_key,
            "x-rapidapi-host": "chatgpt-42.p.rapidapi.com",
            "Content-Type": "application/json",
        }

        try:
            response = requests.post(
                url,
                json=payload,
                headers=headers,
                timeout=30
            )

            print("Status Code:", response.status_code)
            print("Raw Response:", response.text)

            response_data = response.json()

            ai_response = (
                response_data.get("result") or
                response_data.get("message") or
                response_data.get("response") or
                response_data.get("text") or
                "I'm sorry, I couldn't find an answer."
            )

        except requests.exceptions.Timeout:
            print("API timed out!")
            ai_response = "The service is busy. Please try again in a moment."

        except requests.exceptions.ConnectionError:
            print("Connection error!")
            ai_response = "Connection failed. Please check your internet."

        except Exception as e:
            print(f"Error: {e}")
            ai_response = "Something went wrong. Please try again."

        dispatcher.utter_message(text=ai_response)
        return []

