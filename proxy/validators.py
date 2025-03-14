"""
Proxy Validator for DynamicScout AI

Validates proxy connections and measures their performance.
"""

import logging
import time
import aiohttp
import requests
from typing import Dict, List, Tuple, Optional, Any, Union

# Set up logging
logger = logging.getLogger(__name__)

class ProxyValidator:
    """
    Validates proxies and tests their connection performance.
    """
    
    def __init__(self):
        """Initialize the proxy validator."""
        # Test URLs for validating proxies
        self.test_urls = [
            'https://www.google.com',
            'https://www.amazon.com',
            'https://www.wikipedia.org',
            'https://www.github.com'
        ]
        
        # Timeout for validation requests (in seconds)
        self.timeout = 10
        
        # Headers for validation requests
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
        }
    
    def validate(self, proxy_url: str) -> bool:
        """
        Validate a proxy by testing connections to test URLs.
        
        Args:
            proxy_url: Formatted proxy URL
            
        Returns:
            True if proxy is valid, False otherwise
        """
        proxies = {
            'http': proxy_url,
            'https': proxy_url
        }
        
        for url in self.test_urls:
            try:
                response = requests.get(
                    url,
                    proxies=proxies,
                    headers=self.headers,
                    timeout=self.timeout,
                    verify=False
                )
                
                if response.status_code == 200:
                    logger.debug(f"Proxy {proxy_url} valid with {url}")
                    return True
                else:
                    logger.debug(f"Proxy {proxy_url} returned status {response.status_code} with {url}")
            except requests.RequestException as e:
                logger.debug(f"Proxy {proxy_url} failed with {url}: {str(e)}")
        
        return False
    
    async def validate_async(self, proxy_url: str) -> bool:
        """
        Validate a proxy asynchronously.
        
        Args:
            proxy_url: Formatted proxy URL
            
        Returns:
            True if proxy is valid, False otherwise
        """
        for url in self.test_urls:
            try:
                async with aiohttp.ClientSession() as session:
                    proxy = proxy_url
                    async with session.get(
                        url,
                        proxy=proxy,
                        headers=self.headers,
                        timeout=aiohttp.ClientTimeout(total=self.timeout),
                        ssl=False
                    ) as response:
                        if response.status == 200:
                            logger.debug(f"Proxy {proxy_url} valid with {url}")
                            return True
                        else:
                            logger.debug(f"Proxy {proxy_url} returned status {response.status} with {url}")
            except Exception as e:
                logger.debug(f"Proxy {proxy_url} failed with {url}: {str(e)}")
        
        return False
    
    def measure_performance(self, proxy_url: str, test_count: int = 3) -> Dict[str, Any]:
        """
        Measure proxy performance metrics.
        
        Args:
            proxy_url: Formatted proxy URL
            test_count: Number of test requests to make
            
        Returns:
            Dictionary with performance metrics
        """
        proxies = {
            'http': proxy_url,
            'https': proxy_url
        }
        
        results = {
            'success_count': 0,
            'failure_count': 0,
            'avg_response_time': 0,
            'min_response_time': float('inf'),
            'max_response_time': 0,
            'total_response_time': 0
        }
        
        for i in range(test_count):
            url = self.test_urls[i % len(self.test_urls)]
            
            try:
                start_time = time.time()
                response = requests.get(
                    url,
                    proxies=proxies,
                    headers=self.headers,
                    timeout=self.timeout,
                    verify=False
                )
                end_time = time.time()
                
                response_time = (end_time - start_time) * 1000  # Convert to ms
                
                if response.status_code == 200:
                    results['success_count'] += 1
                    results['total_response_time'] += response_time
                    results['min_response_time'] = min(results['min_response_time'], response_time)
                    results['max_response_time'] = max(results['max_response_time'], response_time)
                else:
                    results['failure_count'] += 1
            except requests.RequestException:
                results['failure_count'] += 1
        
        # Calculate averages
        if results['success_count'] > 0:
            results['avg_response_time'] = results['total_response_time'] / results['success_count']
        
        # Set min_response_time to 0 if no successful requests
        if results['min_response_time'] == float('inf'):
            results['min_response_time'] = 0
        
        # Calculate success rate
        total_requests = results['success_count'] + results['failure_count']
        results['success_rate'] = (results['success_count'] / total_requests) * 100 if total_requests > 0 else 0
        
        return results
