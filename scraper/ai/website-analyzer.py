"""
Website Analyzer Module for DynamicScout AI

This module analyzes website structure and determines optimal scraping strategies
using AI-powered techniques.
"""

import json
import logging
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
import re
import time
import random
from typing import Dict, List, Tuple, Optional, Any

# Import LLM integration
from ..utils.llm_client import LLMClient
from ..utils.config import get_config

# Set up logging
logger = logging.getLogger(__name__)
config = get_config()

class WebsiteAnalyzer:
    """
    Analyzes website structure to determine optimal scraping strategy
    using AI-powered techniques.
    """
    
    def __init__(self, url: str, headers: Optional[Dict[str, str]] = None, proxy: Optional[str] = None):
        """
        Initialize the website analyzer.
        
        Args:
            url: Target website URL to analyze
            headers: Optional HTTP headers to use for requests
            proxy: Optional proxy to use for requests
        """
        self.url = url
        self.domain = urlparse(url).netloc
        self.headers = headers or {
            'User-Agent': config.get('SCRAPER_USER_AGENT'),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0'
        }
        self.proxy = proxy
        self.proxies = {'http': proxy, 'https': proxy} if proxy else None
        self.llm_client = LLMClient()
        self.soup = None
        self.structure = {}
        self.strategies = []
        
    async def analyze(self) -> Dict[str, Any]:
        """
        Perform full website analysis and recommend strategies.
        
        Returns:
            Dictionary containing analysis results and recommended strategies
        """
        logger.info(f"Starting website analysis for {self.url}")
        
        try:
            # Fetch and parse the website
            self._fetch_and_parse()
            
            # Extract site structure
            self.structure = self._extract_structure()
            
            # Detect anti-scraping measures
            anti_scraping = self._detect_anti_scraping()
            
            # Determine scraping complexity
            complexity = self._determine_complexity()
            
            # Generate scraping strategies
            self.strategies = await self._generate_strategies()
            
            # Create final analysis result
            analysis_result = {
                'url': self.url,
                'domain': self.domain,
                'structure': self.structure,
                'anti_scraping_measures': anti_scraping,
                'complexity': complexity,
                'recommended_strategies': self.strategies,
                'timestamp': time.time()
            }
            
            logger.info(f"Analysis completed for {self.url}")
            return analysis_result
            
        except Exception as e:
            logger.error(f"Error analyzing website {self.url}: {str(e)}")
            raise
    
    def _fetch_and_parse(self) -> None:
        """Fetch the website content and parse it using BeautifulSoup."""
        try:
            response = requests.get(
                self.url,
                headers=self.headers,
                proxies=self.proxies,
                timeout=config.get('SCRAPER_TIMEOUT', 60) / 1000
            )
            response.raise_for_status()
            
            self.soup = BeautifulSoup(response.text, 'html.parser')
            logger.debug(f"Successfully fetched and parsed {self.url}")
        except requests.RequestException as e:
            logger.error(f"Error fetching {self.url}: {str(e)}")
            raise
    
    def _extract_structure(self) -> Dict[str, Any]:
        """
        Extract website structure information.
        
        Returns:
            Dictionary containing website structure information
        """
        if not self.soup:
            raise ValueError("Website content not fetched")
        
        # Extract page title
        title = self.soup.title.string if self.soup.title else "No title"
        
        # Extract meta information
        meta_tags = {}
        for meta in self.soup.find_all('meta'):
            if meta.get('name'):
                meta_tags[meta['name']] = meta.get('content', '')
            elif meta.get('property'):
                meta_tags[meta['property']] = meta.get('content', '')
        
        # Extract navigation structure
        navigation = []
        nav_elements = self.soup.find_all(['nav', 'header', 'ul', 'ol', 'div'], class_=lambda x: x and ('nav' in x.lower() or 'menu' in x.lower()))
        
        for nav in nav_elements[:3]:  # Limit to first 3 navigation elements
            links = nav.find_all('a')
            if len(links) > 2:  # Only include if it has at least 3 links
                nav_info = {
                    'element': nav.name,
                    'links': [{'text': link.get_text(strip=True), 'href': link.get('href')} for link in links]
                }
                navigation.append(nav_info)
        
        # Extract forms
        forms = []
        for form in self.soup.find_all('form'):
            form_info = {
                'action': form.get('action', ''),
                'method': form.get('method', 'get'),
                'inputs': [{'name': input_tag.get('name', ''), 'type': input_tag.get('type', 'text')} 
                           for input_tag in form.find_all('input') if input_tag.get('type') != 'hidden']
            }
            forms.append(form_info)
        
        # Extract pagination if present
        pagination = None
        pagination_elements = self.soup.find_all(['div', 'nav', 'ul'], class_=lambda x: x and ('pagination' in x.lower() or 'pager' in x.lower()))
        
        if pagination_elements:
            page_links = pagination_elements[0].find_all('a')
            pagination = {
                'present': True,
                'pattern': self._detect_pagination_pattern(page_links)
            }
        else:
            pagination = {'present': False}
        
        # Extract main content area
        main_content = self._identify_main_content()
        
        # Detect common data structures
        data_structures = self._detect_data_structures()
        
        return {
            'title': title,
            'meta': meta_tags,
            'navigation': navigation,
            'forms': forms,
            'pagination': pagination,
            'main_content': main_content,
            'data_structures': data_structures
        }
    
    def _detect_pagination_pattern(self, page_links: List) -> Optional[str]:
        """
        Detect pagination URL pattern from page links.
        
        Args:
            page_links: List of pagination link elements
            
        Returns:
            Detected pagination pattern or None
        """
        if not page_links:
            return None
            
        hrefs = [link.get('href') for link in page_links if link.get('href')]
        
        if not hrefs:
            return None
            
        # Look for common patterns
        page_patterns = [
            r'page=(\d+)',
            r'p=(\d+)',
            r'/page/(\d+)',
            r'/p/(\d+)',
            r'-(\d+)\.html'
        ]
        
        for pattern in page_patterns:
            for href in hrefs:
                match = re.search(pattern, href)
                if match:
                    return pattern
        
        return None
    
    def _identify_main_content(self) -> Dict[str, Any]:
        """
        Identify the main content area of the page.
        
        Returns:
            Dictionary with main content information
        """
        if not self.soup:
            return {'identified': False}
            
        # Common main content selectors
        main_selectors = [
            'main',
            '#main',
            '#content',
            '.main',
            '.content',
            'article',
            '.post',
            '[role="main"]'
        ]
        
        for selector in main_selectors:
            try:
                main_element = self.soup.select_one(selector)
                if main_element:
                    return {
                        'identified': True,
                        'selector': selector,
                        'text_length': len(main_element.get_text(strip=True)),
                        'elements': {
                            'paragraphs': len(main_element.find_all('p')),
                            'headings': len(main_element.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])),
                            'links': len(main_element.find_all('a')),
                            'images': len(main_element.find_all('img'))
                        }
                    }
            except Exception:
                continue
        
        # Fallback to heuristic approach - look for the div with most text content
        divs = self.soup.find_all('div')
        if divs:
            # Find div with most paragraph content
            divs_with_content = [(div, len(div.find_all('p')), len(div.get_text(strip=True))) 
                                for div in divs if len(div.get_text(strip=True)) > 200]
            
            if divs_with_content:
                divs_with_content.sort(key=lambda x: (x[1], x[2]), reverse=True)
                best_div = divs_with_content[0][0]
                
                # Try to get a CSS selector for this div
                selector = self._get_selector_for_element(best_div)
                
                return {
                    'identified': True,
                    'selector': selector,
                    'text_length': len(best_div.get_text(strip=True)),
                    'elements': {
                        'paragraphs': len(best_div.find_all('p')),
                        'headings': len(best_div.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])),
                        'links': len(best_div.find_all('a')),
                        'images': len(best_div.find_all('img'))
                    }
                }
        
        return {'identified': False}
    
    def _get_selector_for_element(self, element) -> str:
        """
        Generate a CSS selector for a given element.
        
        Args:
            element: BeautifulSoup element
            
        Returns:
            CSS selector string
        """
        if element.get('id'):
            return f"#{element['id']}"
        
        if element.get('class'):
            return f".{'.'.join(element['class'])}"
        
        # Fallback to element type with nth-child
        if element.parent:
            siblings = element.parent.find_all(element.name, recursive=False)
            if siblings:
                index = siblings.index(element)
                return f"{element.name}:nth-child({index + 1})"
        
        return element.name
    
    def _detect_data_structures(self) -> List[Dict[str, Any]]:
        """
        Detect common data structures in the page.
        
        Returns:
            List of detected data structures
        """
        structures = []
        
        if not self.soup:
            return structures
        
        # Detect tables
        tables = self.soup.find_all('table')
        for table in tables:
            headers = [th.get_text(strip=True) for th in table.find_all('th')]
            rows = len(table.find_all('tr'))
            
            structures.append({
                'type': 'table',
                'selector': self._get_selector_for_element(table),
                'headers': headers,
                'row_count': rows
            })
        
        # Detect lists
        lists = self.soup.find_all(['ul', 'ol'])
        for list_element in lists:
            # Only include lists with significant number of items
            items = list_element.find_all('li')
            if len(items) > 3:
                structures.append({
                    'type': 'list',
                    'selector': self._get_selector_for_element(list_element),
                    'item_count': len(items)
                })
        
        # Detect product cards or repeated elements
        repeated_patterns = self._find_repeated_patterns()
        if repeated_patterns:
            structures.extend(repeated_patterns)
        
        return structures
    
    def _find_repeated_patterns(self) -> List[Dict[str, Any]]:
        """
        Find repeated element patterns (like product cards, articles, etc.).
        
        Returns:
            List of repeated pattern structures
        """
        patterns = []
        
        if not self.soup:
            return patterns
        
        # Common container selectors for repeated items
        container_selectors = [
            '.products', '.items', '.cards', '.grid', '.results',
            '.product-list', '.item-list', '.card-list',
            '[class*="product"]', '[class*="item"]', '[class*="card"]'
        ]
        
        for selector in container_selectors:
            try:
                containers = self.soup.select(selector)
                for container in containers:
                    # Check for multiple similar children
                    children = container.find_all(recursive=False)
                    
                    if len(children) < 3:
                        continue
                    
                    # Check if children have similar structure
                    if self._are_similar_elements(children[:5]):
                        child_selector = self._get_selector_for_element(children[0])
                        patterns.append({
                            'type': 'repeated_elements',
                            'container_selector': self._get_selector_for_element(container),
                            'item_selector': f"{self._get_selector_for_element(container)} > {child_selector.split('>')[-1].strip()}",
                            'item_count': len(children),
                            'fields': self._extract_item_fields(children[0])
                        })
            except Exception:
                continue
        
        # Fallback to divs with same class
        if not patterns:
            # Group divs by their class
            div_classes = {}
            for div in self.soup.find_all('div', class_=True):
                class_str = ' '.join(sorted(div.get('class')))
                if class_str not in div_classes:
                    div_classes[class_str] = []
                div_classes[class_str].append(div)
            
            # Find classes with multiple occurrences
            for class_str, divs in div_classes.items():
                if len(divs) >= 3 and self._are_similar_elements(divs[:5]):
                    patterns.append({
                        'type': 'repeated_elements',
                        'item_selector': f"div.{'.'.join(divs[0].get('class'))}",
                        'item_count': len(divs),
                        'fields': self._extract_item_fields(divs[0])
                    })
        
        return patterns
    
    def _are_similar_elements(self, elements, similarity_threshold=0.7) -> bool:
        """
        Check if a list of elements have similar structure.
        
        Args:
            elements: List of BeautifulSoup elements
            similarity_threshold: Similarity threshold (0-1)
            
        Returns:
            True if elements are similar, False otherwise
        """
        if not elements or len(elements) < 2:
            return False
        
        # Extract tag structure of first element as reference
        def get_structure(element):
            return [child.name for child in element.find_all(recursive=False)]
        
        reference = get_structure(elements[0])
        if not reference:
            return False
        
        # Compare other elements to reference
        similar_count = 0
        for element in elements[1:]:
            structure = get_structure(element)
            
            # Calculate Jaccard similarity
            intersection = len(set(reference) & set(structure))
            union = len(set(reference) | set(structure))
            
            if union > 0 and intersection / union >= similarity_threshold:
                similar_count += 1
        
        # If most elements are similar, consider them a pattern
        return similar_count >= (len(elements) - 1) * 0.7
    
    def _extract_item_fields(self, element) -> Dict[str, str]:
        """
        Extract possible field selectors from an item.
        
        Args:
            element: BeautifulSoup element
            
        Returns:
            Dictionary of field name to selector
        """
        fields = {}
        
        # Look for common elements inside the item
        title_elements = element.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'a'], 
                                        class_=lambda x: x and ('title' in x.lower() or 'name' in x.lower()))
        if title_elements:
            fields['title'] = self._get_selector_for_element(title_elements[0])
        
        price_elements = element.find_all(['div', 'span', 'p'], 
                                        class_=lambda x: x and 'price' in x.lower())
        if price_elements:
            fields['price'] = self._get_selector_for_element(price_elements[0])
        
        image_elements = element.find_all('img')
        if image_elements:
            fields['image'] = 'img'
            
        description_elements = element.find_all(['div', 'span', 'p'], 
                                            class_=lambda x: x and ('desc' in x.lower() or 'info' in x.lower()))
        if description_elements:
            fields['description'] = self._get_selector_for_element(description_elements[0])
            
        # Find all links
        links = element.find_all('a')
        if links:
            fields['link'] = 'a'
            
        return fields
    
    def _detect_anti_scraping(self) -> Dict[str, Any]:
        """
        Detect anti-scraping measures on the website.
        
        Returns:
            Dictionary with anti-scraping detection results
        """
        if not self.soup:
            return {'detected': False}
            
        measures = []
        
        # Check for JavaScript-based rendering
        js_detection = False
        noscript_tags = self.soup.find_all('noscript')
        if noscript_tags:
            for tag in noscript_tags:
                # If noscript contains substantial content, it might indicate JS is required
                if len(tag.get_text(strip=True)) > 100:
                    js_detection = True
                    break
        
        # Look for minimal content that suggests JS rendering is required
        if self.soup.find_all(['p', 'div', 'span', 'h1', 'h2', 'h3']):
            main_content_length = len(self.soup.get_text(strip=True))
            if main_content_length < 500:  # Very little content might indicate JS rendering
                js_detection = True
        
        if js_detection:
            measures.append({
                'type': 'javascript_rendering',
                'severity': 'high',
                'mitigation': 'Use headless browser'
            })
        
        # Check for CAPTCHA
        captcha_indicators = [
            'captcha',
            'recaptcha',
            'hcaptcha',
            'g-recaptcha',
            'cf-turnstile'
        ]
        
        for indicator in captcha_indicators:
            if self.soup.find_all(attrs={"class": lambda x: x and indicator in x.lower()}) or \
               self.soup.find_all(attrs={"id": lambda x: x and indicator in x.lower()}) or \
               self.soup.find_all(attrs={"name": lambda x: x and indicator in x.lower()}):
                measures.append({
                    'type': 'captcha',
                    'severity': 'high',
                    'mitigation': 'Use CAPTCHA solving service'
                })
                break
        
        # Check for Cloudflare or similar protection
        if "Just a moment" in str(self.soup) and "cloudflare" in str(self.soup).lower():
            measures.append({
                'type': 'cloudflare',
                'severity': 'high',
                'mitigation': 'Use premium proxies with browser fingerprinting'
            })
        
        # Check for rate limiting indicators in the page
        rate_limit_indicators = [
            'rate limit',
            'too many requests',
            'access denied',
            'denied access',
            'blocked',
            'unusual traffic'
        ]
        
        page_text = self.soup.get_text(strip=True).lower()
        for indicator in rate_limit_indicators:
            if indicator in page_text:
                measures.append({
                    'type': 'rate_limiting',
                    'severity': 'medium',
                    'mitigation': 'Use proxies with rotation and delay between requests'
                })
                break
        
        return {
            'detected': len(measures) > 0,
            'measures': measures
        }
    
    def _determine_complexity(self) -> Dict[str, Any]:
        """
        Determine scraping complexity based on site analysis.
        
        Returns:
            Dictionary with complexity assessment
        """
        if not self.soup or not self.structure:
            return {'level': 'unknown'}
        
        score = 0
        factors = []
        
        # Check for anti-scraping measures
        anti_scraping = getattr(self, '_anti_scraping', {'detected': False, 'measures': []})
        if anti_scraping['detected']:
            for measure in anti_scraping['measures']:
                if measure['severity'] == 'high':
                    score += 3
                    factors.append(f"High-severity anti-scraping: {measure['type']}")
                elif measure['severity'] == 'medium':
                    score += 2
                    factors.append(f"Medium-severity anti-scraping: {measure['type']}")
                else:
                    score += 1
                    factors.append(f"Low-severity anti-scraping: {measure['type']}")
        
        # Check for JavaScript rendering requirement
        js_required = False
        for factor in factors:
            if 'javascript_rendering' in factor:
                js_required = True
                break
        
        if not js_required and self._check_javascript_heavy():
            score += 2
            factors.append("JavaScript-heavy site")
            js_required = True
        
        # Check pagination complexity
        pagination = self.structure.get('pagination', {})
        if pagination.get('present', False):
            if not pagination.get('pattern'):
                score += 1
                factors.append("Complex pagination pattern")
            else:
                score += 0.5
                factors.append("Standard pagination")
        
        # Check data structure complexity
        data_structures = self.structure.get('data_structures', [])
        if not data_structures:
            score += 1
            factors.append("No clear data structures detected")
        else:
            # Check for repeated elements (product cards, listings, etc.)
            has_repeated = any(s['type'] == 'repeated_elements' for s in data_structures)
            if has_repeated:
                # Check if fields are well-defined
                for structure in data_structures:
                    if structure['type'] == 'repeated_elements' and len(structure.get('fields', {})) < 2:
                        score += 1
                        factors.append("Poor field definition in repeated elements")
                        break
        
        # Evaluate form complexity
        forms = self.structure.get('forms', [])
        if forms:
            for form in forms:
                if form.get('method', '').lower() == 'post' and len(form.get('inputs', [])) > 3:
                    score += 1
                    factors.append("Complex form interaction required")
                    break
        
        # Determine complexity level
        level = 'low'
        if score >= 5:
            level = 'very high'
        elif score >= 3:
            level = 'high'
        elif score >= 1.5:
            level = 'medium'
        
        return {
            'level': level,
            'score': score,
            'factors': factors,
            'javascript_required': js_required
        }
    
    def _check_javascript_heavy(self) -> bool:
        """
        Check if the site appears to be JavaScript-heavy.
        
        Returns:
            True if site appears to be JavaScript-heavy, False otherwise
        """
        if not self.soup:
            return False
            
        # Count script tags
        script_tags = self.soup.find_all('script')
        inline_scripts = sum(1 for script in script_tags if not script.get('src') and script.string)
        external_scripts = sum(1 for script in script_tags if script.get('src'))
        
        # Look for SPA frameworks
        framework_indicators = [
            'react', 'vue', 'angular', 'ember', 'backbone', 
            'knockout', 'svelte', 'next', 'nuxt'
        ]
        
        page_source = str(self.soup).lower()
        framework_detected = any(indicator in page_source for indicator in framework_indicators)
        
        # Check for AJAX indicators
        ajax_indicators = [
            'fetch(', 'axios.', '.ajax', 'XMLHttpRequest', 
            'new XMLHttpRequest', '$http.'
        ]
        
        ajax_detected = any(indicator in page_source for indicator in ajax_indicators)
        
        # Calculate JavaScript heaviness
        if framework_detected:
            return True
        
        if ajax_detected and (inline_scripts > 3 or external_scripts > 5):
            return True
            
        if inline_scripts > 5 and external_scripts > 8:
            return True
            
        return False
        
    async def _generate_strategies(self) -> List[Dict[str, Any]]:
        """
        Generate AI-powered scraping strategies based on website analysis.
        
        Returns:
            List of recommended scraping strategies
        """
        if not self.soup or not self.structure:
            return []
            
        strategies = []
        complexity = self._determine_complexity()
        anti_scraping = self._detect_anti_scraping()
        
        # Basic strategy - always include
        basic_strategy = {
            'name': 'basic_requests',
            'description': 'Simple HTTP requests with BeautifulSoup parsing',
            'suitable': complexity['level'] in ['low', 'medium'],
            'requirements': {
                'proxy_rotation': anti_scraping['detected'],
                'delay': random.randint(2, 5),
                'user_agent_rotation': True,
                'headers': {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                }
            },
            'parser': 'beautifulsoup',
            'efficiency': 'high' if complexity['level'] == 'low' else 'medium'
        }
        
        strategies.append(basic_strategy)
        
        # Headless browser strategy
        if complexity.get('javascript_required', False) or complexity['level'] in ['high', 'very high']:
            headless_strategy = {
                'name': 'headless_browser',
                'description': 'Headless browser automation with Playwright/Puppeteer',
                'suitable': True,
                'requirements': {
                    'proxy_rotation': anti_scraping['detected'],
                    'delay': random.randint(3, 8),
                    'browser_fingerprint_randomization': True,
                    'cookies_enabled': True,
                    'javascript_enabled': True
                },
                'parser': 'dom',
                'efficiency': 'medium'
            }
            
            strategies.append(headless_strategy)
        
        # API-based strategy (if detected)
        if await self._detect_potential_api():
            api_strategy = {
                'name': 'api_requests',
                'description': 'Direct API requests to fetch data',
                'suitable': True,
                'requirements': {
                    'proxy_rotation': anti_scraping['detected'],
                    'delay': random.randint(1, 3),
                    'headers': {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                },
                'parser': 'json',
                'efficiency': 'very high'
            }
            
            strategies.append(api_strategy)
        
        # Ask LLM for additional strategy suggestions
        try:
            llm_strategies = await self._get_llm_strategy_suggestions()
            if llm_strategies:
                strategies.extend(llm_strategies)
        except Exception as e:
            logger.warning(f"Error getting LLM strategy suggestions: {str(e)}")
        
        # Sort strategies by efficiency
        efficiency_rank = {
            'very high': 4,
            'high': 3,
            'medium': 2,
            'low': 1
        }
        
        strategies.sort(key=lambda s: efficiency_rank.get(s.get('efficiency'), 0), reverse=True)
        
        return strategies
    
    async def _detect_potential_api(self) -> bool:
        """
        Detect if the website potentially has an API that can be used.
        
        Returns:
            True if potential API detected, False otherwise
        """
        if not self.soup:
            return False
            
        # Look for API endpoints in JavaScript
        scripts = self.soup.find_all('script')
        api_patterns = [
            r'api\/v\d+\/',
            r'\/api\/',
            r'\.json\?',
            r'graphql',
            r'\/rest\/'
        ]
        
        for script in scripts:
            if not script.string:
                continue
                
            script_content = script.string.lower()
            for pattern in api_patterns:
                if re.search(pattern, script_content):
                    return True
        
        return False
    
    async def _get_llm_strategy_suggestions(self) -> List[Dict[str, Any]]:
        """
        Get scraping strategy suggestions from LLM.
        
        Returns:
            List of additional strategy suggestions
        """
        # Create analysis summary for LLM
        analysis_summary = {
            'url': self.url,
            'domain': self.domain,
            'title': self.structure.get('title', ''),
            'anti_scraping': self._detect_anti_scraping(),
            'complexity': self._determine_complexity(),
            'data_structures': self.structure.get('data_structures', []),
            'pagination': self.structure.get('pagination', {})
        }
        
        prompt = f"""
        You are an expert web scraping strategist. Analyze this website information and suggest 
        an advanced scraping strategy beyond basic requests and headless browsers.
        
        Website Analysis: {json.dumps(analysis_summary, indent=2)}
        
        Provide ONE innovative strategy in the following JSON format:
        {{
            "name": "strategy_name",
            "description": "Detailed description of the strategy",
            "suitable": true_or_false_based_on_analysis,
            "requirements": {{
                "key_requirements": "values"
            }},
            "parser": "recommended_parser",
            "efficiency": "expected_efficiency_low_medium_high_very_high"
        }}
        
        Return ONLY the JSON object, no other text.
        """
        
        try:
            response = await self.llm_client.generate(prompt)
            strategy = json.loads(response)
            return [strategy]
        except Exception as e:
            logger.warning(f"Error parsing LLM strategy suggestion: {str(e)}")
            return []