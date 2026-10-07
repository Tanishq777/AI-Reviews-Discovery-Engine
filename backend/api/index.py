from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import json
from .scraper import fetch_google_play_reviews, fetch_app_store_reviews, fetch_web_discussions
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalysisRequest(BaseModel):
    query: str
    source: str
    count: int = 100

@app.get("/")
def read_root():
    return {"status": "ok"}

@app.post("/api/analyze")
def analyze(request: AnalysisRequest):
    stopwords = {"a", "an", "the", "in", "on", "at", "to", "for", "is", "are", "was", "were", "it", "this", "that", "of", "and", "or", "but", "as", "how", "why", "what", "can", "could", "would", "should", "not", "no", "with", "from", "about", "i", "you", "he", "she", "we", "they", "my"}
    query_words = [w.strip(".,!?\"'()").lower() for w in request.query.split()]
    dynamic_keywords_list = [w for w in query_words if w not in stopwords and len(w) > 3]
    ddg_query = " ".join(dynamic_keywords_list[:3])

    data = []
    reviews = []
    if request.source == "play_store":
        # Fetch a massive pool (3000) so the filter has a huge dataset to find specific queries
        reviews = fetch_google_play_reviews(count=3000)
    elif request.source == "app_store":
        # Apple RSS hard limits to 500 maximum unfortunately
        reviews = fetch_app_store_reviews(count=500)
    elif request.source == "web_forums":
        reviews = fetch_web_discussions(query=ddg_query, limit=request.count)
    dynamic_keywords = set(dynamic_keywords_list)

    def score_review(content):
        text = content.lower()
        score = 0
        
        for term in dynamic_keywords:
            if term in text:
                score += 5
                
        search_terms = ["search", "find", "looking for", "filter", "tag", "sort", "organize", "remember", "memory", "query"]
        photo_terms = ["photo", "picture", "image", "video", "face", "person", "people", "location", "date", "album"]
        frustration_terms = ["can't find", "couldn't find", "hard to find", "impossible to find", "where is", "lost", "frustrating"]
        
        has_search = False
        has_photo = False
        
        for term in search_terms:
            if term in text:
                score += 2
                has_search = True
                
        for term in frustration_terms:
            if term in text:
                score += 4
                has_search = True
                
        for term in photo_terms:
            if term in text:
                score += 1
                has_photo = True
                
        if has_search and has_photo:
            score += 5
            
        if len(text) < 20:
            score -= 5
            
        generic_bugs = ["crash", "crashing", "won't open", "update ruined", "battery", "slow", "ads", "subscription"]
        for bug in generic_bugs:
            if bug in text:
                score -= 3
                
        return score

    scored_reviews = [(content, score_review(content)) for content in reviews]
    relevant_scored = [r for r in scored_reviews if r[1] > 0]
    relevant_scored.sort(key=lambda x: x[1], reverse=True)
    
    relevant_reviews = [r[0] for r in relevant_scored]
    
    if len(relevant_reviews) < 5:
        relevant_reviews = reviews[:50]
        
    data = relevant_reviews[:30]

    is_live = True
    if not data:
        raise HTTPException(status_code=404, detail="No relevant discussions found. The platform might be blocking the request or the query returned 0 results. Try a different platform.")

    # Analyze with LLM
    try:
        if os.getenv("OPENAI_API_KEY"):
            llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)
        else:
            llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.2)
        prompt = PromptTemplate(
            input_variables=["reviews", "query"],
            template='''
You are an expert UX Researcher analyzing user feedback.
The user is investigating the following problem: {query}

Here is a list of user reviews/comments:
{reviews}

Please analyze these reviews and identify:
1. Common retrieval problems users face when they vaguely remember a photo.
2. The specific ways/strategies users are trying to search.
3. Opportunity areas for improving the search experience.

Output your response in valid JSON format with the following structure:
{{
    "problems": [
        {{"title": "...", "description": "...", "evidence_quote": "..."}}
    ],
    "strategies": [
        {{"title": "...", "description": "...", "evidence_quote": "..."}}
    ],
    "opportunities": [
        {{"title": "...", "description": "..."}}
    ]
}}
Ensure the output is strictly valid JSON without any markdown formatting like ```json.
'''
        )
        
        chain = prompt | llm
        reviews_text = "\n- ".join(data)
        result = chain.invoke({"reviews": reviews_text, "query": request.query})
        
        # Parse JSON
        content = result.content.strip()
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()
            
        parsed_data = json.loads(content)
        parsed_data["is_live"] = is_live
        parsed_data["filtered_reviews"] = data
        parsed_data["raw_reviews"] = reviews
        return parsed_data
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"LLM Error: {e}")
        raise HTTPException(status_code=500, detail=f"LLM Analysis failed: {str(e)}")
