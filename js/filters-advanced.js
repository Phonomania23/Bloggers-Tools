/**
 * Advanced Filters Module for Bloggers.tools
 * Handles advanced filtering functionality with debouncing and event system
 */

class AdvancedFilters {
  constructor() {
    this.state = {
      bound: false,
      initialized: false,
      currentFilters: {}
    };
    
    this.debounceTimers = {};
    this.init();
  }
  
  init() {
    if (this.state.initialized) return;
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.tryInit());
    } else {
      this.tryInit();
    }
    
    this.state.initialized = true;
  }
  
  tryInit() {
    if (this.state.bound) return;
    
    const root = document.getElementById('filtersAdvanced');
    if (!root) {
      setTimeout(() => this.tryInit(), 100);
      return;
    }
    
    this.bindEvents(root);
    this.state.bound = true;
    
    console.log('AdvancedFilters initialized');
  }
  
  bindEvents(root) {
    // Bind all input elements
    const inputs = root.querySelectorAll('input, select');
    
    inputs.forEach(input => {
      const eventType = input.type === 'text' || input.type === 'search' ? 'input' : 'change';
      const handler = this.debounce(() => {
        this.triggerChange();
      }, input.type === 'text' || input.type === 'search' ? 300 : 0);
      
      input.addEventListener(eventType, handler);
    });
    
    // Also trigger change on checkbox clicks for immediate feedback
    root.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('click', () => {
        this.triggerChange();
      });
    });
  }
  
  debounce(func, wait) {
    return (...args) => {
      clearTimeout(this.debounceTimers[func]);
      this.debounceTimers[func] = setTimeout(() => func.apply(this, args), wait);
    };
  }
  
  collectFilters() {
    const root = document.getElementById('filtersAdvanced');
    if (!root) return {};
    
    // Get all content type checkboxes
    const contentTypes = Array.from(
      root.querySelectorAll('input[name="fContentTypes"]:checked')
    ).map(input => input.value);
    
    // Helper function to parse numeric values
    const parseNumber = (value, defaultValue = null) => {
      if (value === '' || value === null || value === undefined) return defaultValue;
      const num = Number(value);
      return isNaN(num) ? defaultValue : num;
    };
    
    const filters = {
      lastPostDays: parseNumber(root.querySelector('#fLastPostDays')?.value),
      contentTypes: contentTypes.length > 0 ? contentTypes : null,
      bioQuery: (root.querySelector('#fBioQuery')?.value || '').trim() || null,
      verified: root.querySelector('#fVerified')?.checked || false,
      hasPhone: root.querySelector('#fHasPhone')?.checked || false,
      postsMin: parseNumber(root.querySelector('#fPostsMin')?.value),
      growth30Min: parseNumber(root.querySelector('#fGrowth30Min')?.value),
      aqsMin: parseNumber(root.querySelector('#fAqsMin')?.value),
      viewsMin: parseNumber(root.querySelector('#fViewsMin')?.value),
      sortBy: root.querySelector('#fSortBy')?.value || '',
      sortDir: root.querySelector('#fSortDir')?.value || 'desc'
    };
    
    this.state.currentFilters = filters;
    return filters;
  }
  
  applyFilters(bloggers, filters = this.collectFilters()) {
    if (!Array.isArray(bloggers) || bloggers.length === 0) {
      return [];
    }
    
    return bloggers.filter(blogger => {
      // 1. Filter by last post days
      if (filters.lastPostDays !== null) {
        const lastPostDays = this.getDaysSince(blogger.lastPostDate);
        if (lastPostDays === null || lastPostDays > filters.lastPostDays) {
          return false;
        }
      }
      
      // 2. Filter by content types
      if (filters.contentTypes && filters.contentTypes.length > 0) {
        const bloggerContentTypes = Array.isArray(blogger.contentFormats) ? 
          blogger.contentFormats : [];
        
        const hasMatchingType = filters.contentTypes.some(type => 
          bloggerContentTypes.includes(type)
        );
        
        if (!hasMatchingType) return false;
      }
      
      // 3. Filter by bio query
      if (filters.bioQuery) {
        const bio = (blogger.bio || '').toLowerCase();
        if (!bio.includes(filters.bioQuery.toLowerCase())) {
          return false;
        }
      }
      
      // 4. Filter by verification
      if (filters.verified && blogger.verified !== "yes") {
        return false;
      }
      
      // 5. Filter by phone availability
      if (filters.hasPhone && !blogger.phone) {
        return false;
      }
      
      // 6. Filter by minimum posts
      if (filters.postsMin !== null && (blogger.postsCount || 0) < filters.postsMin) {
        return false;
      }
      
      // 7. Filter by growth rate
      if (filters.growth30Min !== null && (blogger.growthRate || 0) < filters.growth30Min) {
        return false;
      }
      
      // 8. Filter by AQS
      if (filters.aqsMin !== null) {
        const aqs = this.calculateAQS(blogger);
        if (aqs < filters.aqsMin) return false;
      }
      
      // 9. Filter by views
      if (filters.viewsMin !== null && (blogger.avgViews || 0) < filters.viewsMin) {
        return false;
      }
      
      return true;
    });
  }
  
  sortBloggers(bloggers, filters = this.collectFilters()) {
    if (!filters.sortBy || !Array.isArray(bloggers)) return bloggers;
    
    const sorted = [...bloggers];
    const direction = filters.sortDir === 'asc' ? 1 : -1;
    
    sorted.sort((a, b) => {
      let valueA, valueB;
      
      switch (filters.sortBy) {
        case 'subscribers':
          valueA = a.followers || 0;
          valueB = b.followers || 0;
          break;
        case 'er':
          valueA = a.er || 0;
          valueB = b.er || 0;
          break;
        case 'avg_views':
          valueA = a.avgViews || 0;
          valueB = b.avgViews || 0;
          break;
        case 'price':
          valueA = a.price || 0;
          valueB = b.price || 0;
          break;
        case 'aqs':
          valueA = this.calculateAQS(a);
          valueB = this.calculateAQS(b);
          break;
        case 'last_post_at':
          valueA = a.lastPostDate ? new Date(a.lastPostDate).getTime() : 0;
          valueB = b.lastPostDate ? new Date(b.lastPostDate).getTime() : 0;
          break;
        default:
          return 0;
      }
      
      if (valueA === valueB) return 0;
      return valueA > valueB ? direction : -direction;
    });
    
    return sorted;
  }
  
  getDaysSince(dateString) {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    
    const now = new Date();
    const diffTime = Math.abs(now - date);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  calculateAQS(blogger) {
    // Simple AQS calculation based on engagement rate and other factors
    let score = blogger.er || 0; // Base score is ER
    
    // Bonus for verification
    if (blogger.verified === "yes") score += 5;
    
    // Bonus for high growth rate
    if (blogger.growthRate > 10) score += 5;
    
    // Bonus for recent activity (within 7 days)
    const daysSinceLastPost = this.getDaysSince(blogger.lastPostDate);
    if (daysSinceLastPost !== null && daysSinceLastPost <= 7) {
      score += 3;
    }
    
    return Math.min(100, Math.max(0, score));
  }
  
  triggerChange() {
    const filters = this.collectFilters();
    
    // Dispatch custom event
    const event = new CustomEvent('filters:advancedChanged', {
      detail: { filters }
    });
    
    document.dispatchEvent(event);
  }
  
  // Public methods
  getCurrentFilters() {
    return { ...this.state.currentFilters };
  }
  
  resetFilters() {
    const root = document.getElementById('filtersAdvanced');
    if (!root) return;
    
    // Reset all inputs
    root.querySelectorAll('input, select').forEach(input => {
      if (input.type === 'checkbox' || input.type === 'radio') {
        input.checked = false;
      } else {
        input.value = '';
      }
    });
    
    // Reset selects to first option
    root.querySelectorAll('select').forEach(select => {
      select.selectedIndex = 0;
    });
    
    this.triggerChange();
  }
}

// Initialize and expose globally
window.AdvancedFilters = new AdvancedFilters();

// Auto-initialize when DOM is ready
if (document.readyState !== 'loading') {
  window.AdvancedFilters.init();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    window.AdvancedFilters.init();
  });
}

// Export for module systems if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdvancedFilters;
}