import time

def main():
    print("Scraper service running...")
    while True:
        print("Scraper heartbeat")
        time.sleep(60)

if __name__ == "__main__":
    main()
