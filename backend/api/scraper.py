from google_play_scraper import Sort, reviews as play_reviews
import requests
from duckduckgo_search import DDGS
import os

def fetch_google_play_reviews(app_id="com.google.android.apps.photos", lang="en", country="us", count=200):
    try:
        result, _ = play_reviews(
            app_id,
            lang=lang,
            country=country,
            sort=Sort.NEWEST,
            count=count
        )
        return [r.get("content", "") for r in result]
    except Exception as e:
        print(f"Error fetching Play Store reviews: {e}")
        return []

def fetch_app_store_reviews(app_id="962194608", country="us", count=200):
    try:
        # Using iTunes RSS feed for a more stable, keyless Apple App Store scraping
        url = f"https://itunes.apple.com/{country}/rss/customerreviews/id={app_id}/sortBy=mostRecent/json"
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        
        entries = data.get("feed", {}).get("entry", [])
        # iTunes RSS returns a list, first item is usually app metadata
        reviews = []
        for entry in entries:
            # Different Apple APIs have different structures. Let's try multiple.
            if "content" in entry and "label" in entry["content"]:
                reviews.append(entry["content"]["label"])
            elif "title" in entry and "content" in entry:
                reviews.append(str(entry.get("title", {}).get("label", "")) + " - " + str(entry.get("content", {}).get("label", "")))
            elif isinstance(entry, dict) and "im:rating" in entry:
                 reviews.append(str(entry.get("content", {}).get("label", str(entry))))
        
        return reviews[1:count+1] if reviews else []
    except Exception as e:
        print(f"Error fetching App Store reviews: {e}")
        return []


def fetch_web_discussions(query="google photos search", limit=30):
    try:
        ddgs = DDGS()
        sites = ['site:quora.com', 'site:reddit.com', 'site:androidcentral.com']
        discussions = []
        results_per_site = limit // len(sites) + 1
        
        for site in sites:
            search_query = f'"google photos" search finding {site}'
            try:
                results = ddgs.text(search_query, max_results=results_per_site)
                if results:
                    for r in results:
                        discussions.append(f"Title: {r.get('title', '')}\nSnippet: {r.get('body', '')}")
            except Exception:
                continue
                
        return discussions[:limit]
    except Exception as e:
        print(f"Error fetching web discussions: {e}")
        return []
