from scraper import fetch_app_store_reviews, fetch_reddit_discussions, fetch_web_discussions
print('App Store:', len(fetch_app_store_reviews(count=10)))
print('Reddit:', len(fetch_reddit_discussions()))
print('Web:', len(fetch_web_discussions('google photos search test', limit=5)))
