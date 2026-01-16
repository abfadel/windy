/**
 * Parse HTML string and extract schema information
 */
export function parseHTMLToSchema(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const elements = [];
  
  function traverseNode(node, path = []) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = {
        id: `element-${elements.length}`,
        tag: node.tagName.toLowerCase(),
        classes: Array.from(node.classList),
        attributes: {},
        text: '',
        path: [...path, elements.length],
        children: [],
        isRepeatable: isRepeatableElement(node),
      };
      
      // Get attributes
      for (const attr of node.attributes) {
        if (attr.name !== 'class') {
          element.attributes[attr.name] = attr.value;
        }
      }
      
      // Get direct text content (not from children)
      const textContent = Array.from(node.childNodes)
        .filter(child => child.nodeType === Node.TEXT_NODE)
        .map(child => child.textContent.trim())
        .filter(text => text.length > 0)
        .join(' ');
      
      if (textContent) {
        element.text = textContent;
      }
      
      elements.push(element);
      const currentIndex = elements.length - 1;
      
      // Traverse children
      const childElements = [];
      for (const child of node.children) {
        const childSchema = traverseNode(child, [...path, currentIndex]);
        if (childSchema) {
          childElements.push(childSchema.id);
        }
      }
      element.children = childElements;
      
      return element;
    }
    return null;
  }
  
  // Start from body
  const body = doc.body;
  for (const child of body.children) {
    traverseNode(child);
  }
  
  return elements;
}

/**
 * Determine if an element is repeatable (part of a list, etc.)
 */
function isRepeatableElement(node) {
  const tag = node.tagName.toLowerCase();
  const parent = node.parentElement;
  
  // List items
  if (tag === 'li') return true;
  
  // Multiple similar siblings
  if (parent) {
    const siblings = Array.from(parent.children).filter(
      child => child.tagName === node.tagName
    );
    if (siblings.length > 1) {
      // Check if they have similar class patterns
      const nodeClasses = Array.from(node.classList).sort().join(' ');
      const similarSiblings = siblings.filter(sibling => {
        const siblingClasses = Array.from(sibling.classList).sort().join(' ');
        return siblingClasses === nodeClasses;
      });
      if (similarSiblings.length > 1) return true;
    }
  }
  
  // Common repeatable elements
  const repeatableTags = ['span', 'a', 'button', 'div', 'article', 'section'];
  if (repeatableTags.includes(tag) && parent) {
    const parentTag = parent.tagName.toLowerCase();
    if (['ul', 'ol', 'nav', 'menu'].includes(parentTag)) return true;
  }
  
  return false;
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validate tag name to prevent XSS
 */
function isValidTagName(tag) {
  // Only allow alphanumeric characters and hyphens
  return /^[a-z][a-z0-9\-]*$/i.test(tag);
}

/**
 * Convert schema back to HTML
 */
export function schemaToHTML(elements) {
  if (!elements || elements.length === 0) return '';
  
  function buildElement(elementId) {
    const element = elements.find(el => el.id === elementId);
    if (!element) return '';
    
    // Validate tag name
    if (!isValidTagName(element.tag)) {
      console.warn(`Invalid tag name: ${element.tag}`);
      return '';
    }
    
    const attrs = [];
    if (element.classes.length > 0) {
      // Escape class names
      const escapedClasses = element.classes.map(c => escapeHTML(c)).join(' ');
      attrs.push(`class="${escapedClasses}"`);
    }
    for (const [key, value] of Object.entries(element.attributes)) {
      // Validate attribute name and escape value
      if (/^[a-z][a-z0-9\-]*$/i.test(key)) {
        attrs.push(`${escapeHTML(key)}="${escapeHTML(value)}"`);
      }
    }
    
    const attrString = attrs.length > 0 ? ' ' + attrs.join(' ') : '';
    
    const childrenHTML = element.children
      .map(childId => buildElement(childId))
      .join('');
    
    // Escape text content
    const textContent = escapeHTML(element.text || '');
    
    return `<${element.tag}${attrString}>${textContent}${childrenHTML}</${element.tag}>`;
  }
  
  // Build root elements (those not referenced as children)
  const childIds = new Set();
  elements.forEach(el => el.children.forEach(childId => childIds.add(childId)));
  
  const rootElements = elements.filter(el => !childIds.has(el.id));
  
  return rootElements.map(el => buildElement(el.id)).join('\n');
}

/**
 * Generate form fields for an element based on its schema
 */
export function generateFormFields(element) {
  const fields = [];
  
  // Tag name field
  fields.push({
    name: 'tag',
    label: 'Tag',
    type: 'text',
    value: element.tag,
    readonly: true,
  });
  
  // Text content field
  if (element.text !== undefined) {
    fields.push({
      name: 'text',
      label: 'Text Content',
      type: 'textarea',
      value: element.text,
    });
  }
  
  // Classes field
  fields.push({
    name: 'classes',
    label: 'Classes',
    type: 'text',
    value: element.classes.join(' '),
  });
  
  // Attributes
  for (const [key, value] of Object.entries(element.attributes)) {
    fields.push({
      name: `attr_${key}`,
      label: key,
      type: 'text',
      value: value,
    });
  }
  
  return fields;
}
