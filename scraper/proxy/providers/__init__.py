"""
Proxy Provider Factory for DynamicScout AI

Factory module for creating proxy service provider instances.
"""

import logging
from typing import Any

# Set up logging
logger = logging.getLogger(__name__)

def get_provider(provider_name: str) -> Any:
    """
    Get a proxy provider instance based on provider name.
    
    Args:
        provider_name: Name of the proxy provider
        
    Returns:
        Provider instance
    
    Raises:
        ValueError: If provider is not supported
    """
    provider_name = provider_name.lower()
    
    if provider_name == 'luminati' or provider_name == 'brightdata':
        from .luminati import LuminatiProvider
        return LuminatiProvider()
    elif provider_name == 'smartproxy':
        from .smartproxy import SmartproxyProvider
        return SmartproxyProvider()
    elif provider_name == 'oxylabs':
        from .oxylabs import OxylabsProvider
        return OxylabsProvider()
    elif provider_name == 'proxy_list':
        from .proxy_list import ProxyListProvider
        return ProxyListProvider()
    else:
        logger.warning(f"Unknown proxy provider: {provider_name}. Falling back to default.")
        from .proxy_list import ProxyListProvider
        return ProxyListProvider()
