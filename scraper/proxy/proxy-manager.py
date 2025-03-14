"""
Proxy Management Service for DynamicScout AI

Manages proxy rotation, health checking, and integration with proxy service providers.
"""

import asyncio
import logging
import random
import time
import json
import aiohttp
import requests
from typing import Dict, List, Optional, Tuple, Any, Union
import threading
from datetime import datetime, timedelta

from ..utils.config import get_config
from .validators import ProxyValidator
from .providers import get_provider

# Set up logging
logger = logging.getLogger(__name__)
config = get_config()

class ProxyManager:
    """
    Manages proxy rotation, health checking, and provider integration
    for DynamicScout AI scraping operations.
    """
    
    def __init__(self):
        """Initialize the proxy manager."""
        self.config = config
        self.use_proxies = config.get('USE_PROXIES', False)
        self.provider_name = config.get('PROXY_SERVICE', 'luminati')
        self.proxies = []
        self.active_proxies = []
        self.blacklisted_proxies = []
        self.proxy_performance = {}
        self.last_refresh = None
        self.refresh_interval = 3600  # 1 hour in seconds
        self.lock = threading.RLock()
        self.validator = ProxyValidator()
        self.provider = get_provider(self.provider_name)
        
        # Load any saved proxies
        self._load_saved_proxies()
        
        # Start background tasks if proxies are enabled
        if self.use_proxies:
            self._start_background_tasks()
    
    def _load_saved_proxies(self) -> None:
        """Load previously saved proxies from storage."""
        try:
            with open('proxy_cache.json', 'r') as f:
                data = json.load(f)
                self.proxies = data.get('proxies', [])
                self.proxy_performance = data.get('performance', {})
                self.blacklisted_proxies = data.get('blacklisted', [])
                last_refresh_str = data.get('last_refresh')
                
                if last_refresh_str:
                    self.last_refresh = datetime.fromisoformat(last_refresh_str)
                
                # Filter for active proxies
                self.active_proxies = [p for p in self.proxies if p.get('is_active', True)]
                
                logger.info(f"Loaded {len(self.active_proxies)} active proxies from cache")
        except (FileNotFoundError, json.JSONDecodeError):
            logger.info("No proxy cache found or invalid format, will fetch new proxies")
    
    def _save_proxies(self) -> None:
        """Save current proxies to storage."""
        try:
            data = {
                'proxies': self.proxies,
                'performance': self.proxy_performance,
                'blacklisted': self.blacklisted_proxies,
                'last_refresh': datetime.now().isoformat()
            }
            
            with open('proxy_cache.json', 'w') as f:
                json.dump(data, f)
                
            logger.debug("Saved proxy data to cache")
        except Exception as e:
            logger.error(f"Error saving proxy cache: {str(e)}")
    
    def _start_background_tasks(self) -> None:
        """Start background tasks for proxy management."""
        refresh_thread = threading.Thread(target=self._refresh_loop, daemon=True)
        refresh_thread.start()
        
        health_check_thread = threading.Thread(target=self._health_check_loop, daemon=True)
        health_check_thread.start()
        
        logger.info("Started proxy management background tasks")
    
    def _refresh_loop(self) -> None:
        """Background loop for refreshing proxies."""
        while True:
            try:
                # Check if we need to refresh proxies
                if not self.last_refresh or (datetime.now() - self.last_refresh).total_seconds() >= self.refresh_interval:
                    self.refresh_proxies()
                
                # Sleep for a while before checking again
                time.sleep(300)  # Check every 5 minutes
            except Exception as e:
                logger.error(f"Error in proxy refresh loop: {str(e)}")
                time.sleep(60)  # Shorter sleep on error
    
    def _health_check_loop(self) -> None:
        """Background loop for checking proxy health."""
        while True:
            try:
                if self.active_proxies:
                    asyncio.run(self._check_proxy_health())
                
                # Sleep for a while before checking again
                time.sleep(900)  # Check every 15 minutes
            except Exception as e:
                logger.error(f"Error in proxy health check loop: {str(e)}")
                time.sleep(60)
    
    async def _check_proxy_health(self) -> None:
        """Check health of all active proxies."""
        logger.info(f"Performing health check on {len(self.active_proxies)} proxies")
        
        tasks = []
        for proxy in self.active_proxies:
            task = asyncio.create_task(self._check_single_proxy(proxy))
            tasks.append(task)
        
        # Wait for all health checks to complete
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        blacklisted = 0
        with self.lock:
            for proxy, result in zip(self.active_proxies, results):
                if isinstance(result, Exception):
                    logger.warning(f"Error checking proxy {proxy['host']}:{proxy['port']}: {str(result)}")
                    continue
                
                if not result:
                    proxy['failure_count'] = proxy.get('failure_count', 0) + 1
                    if proxy['failure_count'] >= 3:
                        proxy['is_active'] = False
                        self.blacklisted_proxies.append(proxy)
                        blacklisted += 1
                else:
                    proxy['failure_count'] = 0
            
            # Update active proxies list
            self.active_proxies = [p for p in self.proxies if p.get('is_active', True)]
            
            # Save updated proxy information
            self._save_proxies()
        
        logger.info(f"Health check completed. Blacklisted {blacklisted} proxies. {len(self.active_proxies)} active proxies remaining.")
    
    async def _check_single_proxy(self, proxy: Dict[str, Any]) -> bool:
        """
        Check health of a single proxy.
        
        Args:
            proxy: Proxy information dictionary
            
        Returns:
            True if proxy is healthy, False otherwise
        """
        proxy_url = self._format_proxy_url(proxy)
        start_time = time.time()
        success = await self.validator.validate_async(proxy_url)
        
        if success:
            response_time = int((time.time() - start_time) * 1000)
            
            # Update performance metrics
            proxy_id = f"{proxy['host']}:{proxy['port']}"
            if proxy_id not in self.proxy_performance:
                self.proxy_performance[proxy_id] = {
                    'total_requests': 0,
                    'successful_requests': 0,
                    'total_response_time': 0,
                    'avg_response_time': 0,
                    'last_success': None
                }
            
            perf = self.proxy_performance[proxy_id]
            perf['total_requests'] += 1
            perf['successful_requests'] += 1
            perf['total_response_time'] += response_time
            perf['avg_response_time'] = perf['total_response_time'] // perf['successful_requests']
            perf['last_success'] = datetime.now().isoformat()
            
            # Update proxy record
            proxy['last_checked'] = datetime.now().isoformat()
            proxy['avg_response_time'] = perf['avg_response_time']
        
        return success
    
    def refresh_proxies(self) -> None:
        """Refresh the proxy list from the provider."""
        if not self.use_proxies:
            logger.info("Proxies are disabled in configuration")
            return
        
        logger.info(f"Refreshing proxies from provider: {self.provider_name}")
        
        try:
            # Get proxies from provider
            new_proxies = self.provider.get_proxies()
            
            if not new_proxies:
                logger.warning("No proxies received from provider")
                return
            
            logger.info(f"Received {len(new_proxies)} proxies from provider")
            
            with self.lock:
                # Merge with existing proxies
                existing_proxy_ids = {f"{p['host']}:{p['port']}" for p in self.proxies}
                
                for proxy in new_proxies:
                    proxy_id = f"{proxy['host']}:{proxy['port']}"
                    if proxy_id not in existing_proxy_ids:
                        proxy['is_active'] = True
                        proxy['added_at'] = datetime.now().isoformat()
                        self.proxies.append(proxy)
                        existing_proxy_ids.add(proxy_id)
                
                # Update active proxies
                self.active_proxies = [p for p in self.proxies if p.get('is_active', True)]
                
                # Update refresh timestamp
                self.last_refresh = datetime.now()
                
                # Save to cache
                self._save_proxies()
            
            logger.info(f"Proxy refresh completed. Total proxies: {len(self.proxies)}, Active: {len(self.active_proxies)}")
            
        except Exception as e:
            logger.error(f"Error refreshing proxies: {str(e)}")
    
    def get_proxy(self, country: Optional[str] = None, max_response_time: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """
        Get a proxy with optional filtering criteria.
        
        Args:
            country: Optional country code filter
            max_response_time: Optional maximum response time in ms
            
        Returns:
            Proxy information dictionary or None if no suitable proxy found
        """
        if not self.use_proxies or not self.active_proxies:
            return None
        
        with self.lock:
            # Filter proxies based on criteria
            filtered_proxies = self.active_proxies
            
            if country:
                filtered_proxies = [p for p in filtered_proxies if p.get('country') == country]
            
            if max_response_time and filtered_proxies:
                filtered_proxies = [p for p in filtered_proxies if p.get('avg_response_time', 999999) <= max_response_time]
            
            # Return None if no matching proxies
            if not filtered_proxies:
                logger.warning(f"No matching proxies found for criteria: country={country}, max_response_time={max_response_time}")
                return None
            
            # Select a proxy, favoring those with better performance
            if len(filtered_proxies) <= 3:
                # Simple random selection for small sets
                proxy = random.choice(filtered_proxies)
            else:
                # Weighted selection based on response time
                proxies_with_time = [(p, p.get('avg_response_time', 500)) for p in filtered_proxies]
                
                # Invert response time to favor faster proxies
                total_weight = sum(1000 // rt if rt > 0 else 1000 for _, rt in proxies_with_time)
                if total_weight <= 0:
                    proxy = random.choice(filtered_proxies)
                else:
                    # Weighted random selection
                    r = random.uniform(0, total_weight)
                    current_weight = 0
                    
                    for p, rt in proxies_with_time:
                        weight = 1000 // rt if rt > 0 else 1000
                        current_weight += weight
                        if current_weight >= r:
                            proxy = p
                            break
                    else:
                        proxy = proxies_with_time[-1][0]
            
            # Update usage stats
            proxy['last_used'] = datetime.now().isoformat()
            
            return proxy
    
    def report_proxy_result(self, proxy: Dict[str, Any], success: bool, response_time: Optional[int] = None) -> None:
        """
        Report success or failure of a proxy.
        
        Args:
            proxy: Proxy information dictionary
            success: Whether the proxy worked successfully
            response_time: Optional response time in ms
        """
        if not proxy:
            return
        
        proxy_id = f"{proxy['host']}:{proxy['port']}"
        
        with self.lock:
            # Initialize performance tracking if needed
            if proxy_id not in self.proxy_performance:
                self.proxy_performance[proxy_id] = {
                    'total_requests': 0,
                    'successful_requests': 0,
                    'total_response_time': 0,
                    'avg_response_time': 0,
                    'last_success': None
                }
            
            perf = self.proxy_performance[proxy_id]
            perf['total_requests'] += 1
            
            if success:
                perf['successful_requests'] += 1
                perf['last_success'] = datetime.now().isoformat()
                
                if response_time:
                    perf['total_response_time'] += response_time
                    perf['avg_response_time'] = perf['total_response_time'] // perf['successful_requests']
                
                # Reset failure count on success
                for p in self.proxies:
                    if p['host'] == proxy['host'] and p['port'] == proxy['port']:
                        p['failure_count'] = 0
                        break
            else:
                # Update failure count
                for p in self.proxies:
                    if p['host'] == proxy['host'] and p['port'] == proxy['port']:
                        p['failure_count'] = p.get('failure_count', 0) + 1
                        
                        # Blacklist if too many failures
                        if p['failure_count'] >= 3:
                            p['is_active'] = False
                            self.blacklisted_proxies.append(p)
                            logger.info(f"Blacklisted proxy {proxy_id} after {p['failure_count']} failures")
                            
                            # Update active proxies list
                            self.active_proxies = [p for p in self.proxies if p.get('is_active', True)]
                        break
            
            # Save updates periodically
            if random.random() < 0.1:  # 10% chance to save on each report
                self._save_proxies()
    
    def get_proxy_url(self, proxy: Optional[Dict[str, Any]] = None) -> Optional[str]:
        """
        Get a formatted proxy URL for use in requests.
        
        Args:
            proxy: Optional proxy information (if None, a proxy will be selected)
            
        Returns:
            Formatted proxy URL or None if proxies are disabled
        """
        if not self.use_proxies:
            return None
        
        if not proxy:
            proxy = self.get_proxy()
            if not proxy:
                return None
        
        return self._format_proxy_url(proxy)
    
    def _format_proxy_url(self, proxy: Dict[str, Any]) -> str:
        """
        Format a proxy dictionary into a URL string.
        
        Args:
            proxy: Proxy information dictionary
            
        Returns:
            Formatted proxy URL string
        """
        protocol = proxy.get('protocol', 'http').lower()
        host = proxy['host']
        port = proxy['port']
        username = proxy.get('username')
        password = proxy.get('password')
        
        if username and password:
            auth = f"{username}:{password}@"
        else:
            auth = ""
        
        return f"{protocol}://{auth}{host}:{port}"
    
    def get_proxy_stats(self) -> Dict[str, Any]:
        """
        Get statistics about proxy usage and performance.
        
        Returns:
            Dictionary with proxy statistics
        """
        with self.lock:
            # Calculate overall statistics
            total_proxies = len(self.proxies)
            active_proxies = len(self.active_proxies)
            blacklisted_proxies = len(self.blacklisted_proxies)
            
            # Calculate success rate and average response time
            success_rates = []
            response_times = []
            
            for perf in self.proxy_performance.values():
                if perf['total_requests'] > 0:
                    success_rate = perf['successful_requests'] / perf['total_requests'] * 100
                    success_rates.append(success_rate)
                
                if perf['successful_requests'] > 0:
                    response_times.append(perf['avg_response_time'])
            
            avg_success_rate = sum(success_rates) / len(success_rates) if success_rates else 0
            avg_response_time = sum(response_times) / len(response_times) if response_times else 0
            
            # Get country distribution
            countries = {}
            for proxy in self.proxies:
                country = proxy.get('country', 'unknown')
                countries[country] = countries.get(country, 0) + 1
            
            return {
                'total_proxies': total_proxies,
                'active_proxies': active_proxies,
                'blacklisted_proxies': blacklisted_proxies,
                'avg_success_rate': round(avg_success_rate, 2),
                'avg_response_time_ms': round(avg_response_time, 2),
                'countries': countries,
                'last_refresh': self.last_refresh.isoformat() if self.last_refresh else None
            }

# Singleton instance
_proxy_manager = None

def get_proxy_manager() -> ProxyManager:
    """
    Get the global proxy manager instance.
    
    Returns:
        ProxyManager instance
    """
    global _proxy_manager
    if _proxy_manager is None:
        _proxy_manager = ProxyManager()
    return _proxy_manager

# Main entry point for running as a standalone service
if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    logger.info("Starting Proxy Management Service")
    
    # Initialize and run proxy manager
    proxy_manager = get_proxy_manager()
    
    if not proxy_manager.use_proxies:
        logger.warning("Proxies are disabled in configuration. Enable USE_PROXIES=true to use this service.")
    
    # Initial proxy refresh
    if proxy_manager.use_proxies:
        proxy_manager.refresh_proxies()
    
    # Keep the service running
    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        logger.info("Proxy Management Service shutting down")
