import time

def main():
    print("Proxy Manager service running...")
    while True:
        print("Proxy Manager heartbeat")
        time.sleep(60)

if __name__ == "__main__":
    main()
