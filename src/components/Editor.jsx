import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { parseHTMLToSchema, schemaToHTML, generateFormFields } from '../utils/schemaParser';

export default function Editor() {
  const [htmlCode, setHtmlCode] = useState(getDefaultHTML());
  const [schema, setSchema] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [viewMode, setViewMode] = useState('split'); // 'code', 'preview', 'split'
  const iframeRef = useRef(null);
  
  useEffect(() => {
    updateSchema();
  }, [htmlCode]);
  
  useEffect(() => {
    if (iframeRef.current) {
      updatePreview();
    }
  }, [htmlCode]);
  
  function updateSchema() {
    const parsed = parseHTMLToSchema(htmlCode);
    setSchema(parsed);
  }
  
  function updatePreview() {
    const iframe = iframeRef.current;
    if (!iframe) return;
    
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { margin: 0; padding: 16px; }
            .editable:hover {
              outline: 2px solid rgba(59, 130, 246, 0.5);
              outline-offset: 2px;
              cursor: pointer;
            }
            .editable-active {
              outline: 2px solid rgb(59, 130, 246);
              outline-offset: 2px;
            }
          </style>
        </head>
        <body>
          ${htmlCode}
        </body>
      </html>
    `);
    doc.close();
    
    // Wait for iframe to fully load before making elements editable
    const handleLoad = () => {
      // Check if body content is ready
      const checkReady = setInterval(() => {
        if (doc.body && doc.body.children.length > 0) {
          clearInterval(checkReady);
          makeElementsEditable(doc);
        }
      }, 100);
      
      // Safety timeout to prevent infinite checking
      setTimeout(() => clearInterval(checkReady), 5000);
    };
    
    // Use iframe load event or fallback to timeout
    if (iframe.contentWindow) {
      iframe.contentWindow.addEventListener('load', handleLoad, { once: true });
    } else {
      setTimeout(handleLoad, 500);
    }
  }
  
  function makeElementsEditable(doc) {
    const elements = doc.body.querySelectorAll('*');
    elements.forEach((el, index) => {
      el.classList.add('editable');
      el.setAttribute('data-element-id', `element-${index}`);
      
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const elementId = el.getAttribute('data-element-id');
        const element = schema.find(s => s.id === elementId);
        if (element) {
          setSelectedElement(element);
          // Highlight selected element
          doc.querySelectorAll('.editable-active').forEach(active => {
            active.classList.remove('editable-active');
          });
          el.classList.add('editable-active');
        }
      });
      
      // Make text editable on double-click
      el.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        if (el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
          const originalText = el.textContent;
          el.contentEditable = true;
          el.focus();
          
          el.addEventListener('blur', () => {
            el.contentEditable = false;
            const newText = el.textContent;
            if (newText !== originalText) {
              updateElementText(el.getAttribute('data-element-id'), newText);
            }
          }, { once: true });
          
          el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              el.blur();
            }
          });
        }
      });
    });
  }
  
  function updateElementText(elementId, newText) {
    const updatedSchema = schema.map(el => {
      if (el.id === elementId) {
        return { ...el, text: newText };
      }
      return el;
    });
    setSchema(updatedSchema);
    const newHTML = schemaToHTML(updatedSchema);
    setHtmlCode(newHTML);
  }
  
  function handleCodeChange(e) {
    setHtmlCode(e.target.value);
  }
  
  function handleFormUpdate(elementId, field, value) {
    const updatedSchema = schema.map(el => {
      if (el.id === elementId) {
        if (field === 'text') {
          return { ...el, text: value };
        } else if (field === 'classes') {
          return { ...el, classes: value.split(' ').filter(c => c) };
        } else if (field.startsWith('attr_')) {
          const attrName = field.replace('attr_', '');
          return { ...el, attributes: { ...el.attributes, [attrName]: value } };
        }
      }
      return el;
    });
    setSchema(updatedSchema);
    const newHTML = schemaToHTML(updatedSchema);
    setHtmlCode(newHTML);
  }
  
  function addRepeatableElement(element) {
    // Clone the element and add it after the original
    const newElement = {
      ...element,
      id: `element-${schema.length}`,
      text: element.text || 'New Item',
    };
    
    const updatedSchema = [...schema, newElement];
    setSchema(updatedSchema);
    const newHTML = schemaToHTML(updatedSchema);
    setHtmlCode(newHTML);
  }
  
  function removeElement(elementId) {
    const updatedSchema = schema.filter(el => el.id !== elementId);
    // Update IDs
    const reindexed = updatedSchema.map((el, idx) => ({
      ...el,
      id: `element-${idx}`,
    }));
    setSchema(reindexed);
    const newHTML = schemaToHTML(reindexed);
    setHtmlCode(newHTML);
    setSelectedElement(null);
  }
  
  return (
    <div class="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div class="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div class="p-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-800">Element Inspector</h2>
        </div>
        
        {schema.length === 0 ? (
          <div class="p-4 text-gray-500 text-sm">
            No elements to display. Add some HTML in the code editor.
          </div>
        ) : (
          <div class="p-4 space-y-4">
            {schema.map((element, index) => (
              <ElementCard
                key={element.id}
                element={element}
                isSelected={selectedElement?.id === element.id}
                onSelect={() => setSelectedElement(element)}
                onUpdate={handleFormUpdate}
                onAdd={addRepeatableElement}
                onRemove={removeElement}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Main Content */}
      <div class="flex-1 flex flex-col">
        {/* Toolbar */}
        <div class="bg-white border-b border-gray-200 p-2 flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <button
              class={`px-3 py-1 rounded ${viewMode === 'code' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              onClick={() => setViewMode('code')}
            >
              Code
            </button>
            <button
              class={`px-3 py-1 rounded ${viewMode === 'split' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              onClick={() => setViewMode('split')}
            >
              Split
            </button>
            <button
              class={`px-3 py-1 rounded ${viewMode === 'preview' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              onClick={() => setViewMode('preview')}
            >
              Preview
            </button>
          </div>
          <div class="text-sm text-gray-600">
            {schema.length} element{schema.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        {/* Editor Area */}
        <div class="flex-1 flex overflow-hidden">
          {/* Code Editor */}
          {(viewMode === 'code' || viewMode === 'split') && (
            <div class={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} flex flex-col border-r border-gray-200`}>
              <div class="bg-gray-800 text-white px-4 py-2 text-sm font-mono">
                HTML Source
              </div>
              <textarea
                class="flex-1 p-4 font-mono text-sm resize-none focus:outline-none"
                value={htmlCode}
                onInput={handleCodeChange}
                spellcheck={false}
              />
            </div>
          )}
          
          {/* Live Preview */}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div class={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} flex flex-col bg-white`}>
              <div class="bg-gray-800 text-white px-4 py-2 text-sm font-mono">
                Live Preview
              </div>
              <iframe
                ref={iframeRef}
                class="flex-1 border-0"
                title="Preview"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ElementCard({ element, isSelected, onSelect, onUpdate, onAdd, onRemove }) {
  const [isExpanded, setIsExpanded] = useState(isSelected);
  const fields = generateFormFields(element);
  
  useEffect(() => {
    if (isSelected) {
      setIsExpanded(true);
    }
  }, [isSelected]);
  
  return (
    <div class={`border rounded-lg overflow-hidden ${isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200'}`}>
      <div
        class={`p-3 cursor-pointer ${isSelected ? 'bg-blue-50' : 'bg-gray-50'} hover:bg-gray-100`}
        onClick={() => {
          onSelect();
          setIsExpanded(!isExpanded);
        }}
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-xs font-mono text-gray-500">&lt;{element.tag}&gt;</span>
            {element.text && (
              <span class="text-xs text-gray-600 truncate max-w-32">
                "{element.text.substring(0, 20)}{element.text.length > 20 ? '...' : ''}"
              </span>
            )}
          </div>
          <div class="flex items-center space-x-1">
            {element.isRepeatable && (
              <span class="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                repeatable
              </span>
            )}
            <svg
              class={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div class="p-3 space-y-3 bg-white">
          {fields.map(field => (
            <div key={field.name}>
              <label class="block text-xs font-medium text-gray-700 mb-1">
                {field.label}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={field.value}
                  onInput={(e) => onUpdate(element.id, field.name, e.target.value)}
                  rows={2}
                  disabled={field.readonly}
                />
              ) : (
                <input
                  type="text"
                  class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={field.value}
                  onInput={(e) => onUpdate(element.id, field.name, e.target.value)}
                  disabled={field.readonly}
                />
              )}
            </div>
          ))}
          
          <div class="flex space-x-2 pt-2 border-t border-gray-200">
            {element.isRepeatable && (
              <button
                class="flex-1 px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                onClick={() => onAdd(element)}
              >
                + Add Similar
              </button>
            )}
            <button
              class="flex-1 px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
              onClick={() => onRemove(element.id)}
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getDefaultHTML() {
  return `<div class="max-w-4xl mx-auto p-8">
  <h1 class="text-4xl font-bold text-gray-900 mb-4">Welcome to WindV</h1>
  <p class="text-lg text-gray-700 mb-6">A standalone TailwindCSS visual editor for CMS integration.</p>
  
  <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
    <h2 class="text-2xl font-semibold text-blue-900 mb-3">Features</h2>
    <ul class="space-y-2">
      <li class="flex items-start">
        <span class="text-blue-600 mr-2">•</span>
        <span class="text-gray-700">Live preview and source code editing</span>
      </li>
      <li class="flex items-start">
        <span class="text-blue-600 mr-2">•</span>
        <span class="text-gray-700">Inline text editing with double-click</span>
      </li>
      <li class="flex items-start">
        <span class="text-blue-600 mr-2">•</span>
        <span class="text-gray-700">Dynamic sidebar forms based on element schema</span>
      </li>
      <li class="flex items-start">
        <span class="text-blue-600 mr-2">•</span>
        <span class="text-gray-700">Add and remove repeatable elements</span>
      </li>
    </ul>
  </div>
  
  <div class="grid grid-cols-2 gap-4">
    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <h3 class="font-medium text-gray-900 mb-2">Card 1</h3>
      <p class="text-gray-600 text-sm">Edit this text by double-clicking it in the preview.</p>
    </div>
    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <h3 class="font-medium text-gray-900 mb-2">Card 2</h3>
      <p class="text-gray-600 text-sm">Click any element to edit its properties in the sidebar.</p>
    </div>
  </div>
  
  <nav class="mt-8">
    <ul class="flex space-x-4">
      <li><a href="#" class="text-blue-600 hover:text-blue-800">Link 1</a></li>
      <li><a href="#" class="text-blue-600 hover:text-blue-800">Link 2</a></li>
      <li><a href="#" class="text-blue-600 hover:text-blue-800">Link 3</a></li>
    </ul>
  </nav>
</div>`;
}
