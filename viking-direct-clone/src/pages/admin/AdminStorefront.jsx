import { useState, useEffect } from 'react'
import { useSiteSettings } from '../../context/SettingsContext'
import ImageInput from './ImageInput'
import LinkInput from './LinkInput'
import ColorInput, { TEXT_COLORS } from './ColorInput'
import FooterEditor from './FooterEditor'
import { Save, AlertCircle, CheckCircle2, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

// Every editor starts empty. A block stays hidden on the storefront until real
// content is saved, so the admin must never be pre-filled with sample claims
// that would go live on the first save.
const defaults = {
  trust_bar: [],
  hero_banners: [],
  deals_section: [],
  top_recommendations: [],
  free_gifts_banner: [],
  promo_cards: [],
  trust_banners_delivery: [],
  trust_banners_service: [],
  viking_one_section: [],
}

// Schemas to render the visual UI dynamically
const schemas = {
  trust_bar: [
    { key: 'icon', label: 'Icon', type: 'select', options: [{val:'', label:'None'}, {val:'truck', label:'Truck'}, {val:'clock', label:'Clock'}, {val:'rotate', label:'Rotate'}, {val:'nectar', label:'Nectar'}] },
    { key: 'main', label: 'Main Text', type: 'text' },
    { key: 'highlight', label: 'Highlight Text', type: 'text' },
    { key: 'suffix', label: 'Suffix Text', type: 'text' },
    { key: 'url', label: 'Opens (when clicked)', type: 'link' }
  ],
  hero_banners: [
    { key: 'title', label: 'Title (required)', type: 'text' },
    { key: 'subtitle', label: 'Subtitle', type: 'text' },
    { key: 'delivery', label: 'Delivery line (e.g. Next working day delivery)', type: 'text' },
    { key: 'priceLabel', label: 'Price label (e.g. From)', type: 'text' },
    { key: 'price', label: 'Price text (e.g. £2.29)', type: 'text' },
    { key: 'unit', label: 'Unit (e.g. / Pack)', type: 'text' },
    { key: 'badgeText', label: 'Red badge text (e.g. Up to 33% off)', type: 'text' },
    { key: 'image', label: 'Picture', type: 'image' },
    { key: 'bgColor', label: 'Background colour', type: 'color' },
    { key: 'link', label: 'Opens (when clicked)', type: 'link' }
  ],
  deals_section: [
    { key: 'title', label: 'Title (required)', type: 'text' },
    { key: 'subtitle', label: 'Subtitle', type: 'text' },
    { key: 'badge', label: 'Red badge text (e.g. Up to 22% off)', type: 'text' },
    { key: 'image', label: 'Picture', type: 'image' },
    { key: 'bgColor', label: 'Background colour', type: 'color' },
    { key: 'textStyle', label: 'Text colour', type: 'select', options: [{val:'dark', label:'Dark text'}, {val:'light', label:'White text'}] },
    { key: 'link', label: 'Opens (when clicked)', type: 'link' }
  ],
  top_recommendations: [
    { key: 'name', label: 'Display name (required)', type: 'text' },
    { key: 'image', label: 'Picture', type: 'image' },
    { key: 'fallbackBg', label: 'Circle colour (used when there is no picture)', type: 'color' },
    { key: 'link', label: 'Opens (when clicked)', type: 'link' }
  ],
  free_gifts_banner: [
    { key: 'src', label: 'Picture (required)', type: 'image' },
    { key: 'alt', label: 'Image Alt text', type: 'text' },
    { key: 'link', label: 'Opens (when clicked)', type: 'link' }
  ],
  trust_banners_delivery: [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'subtitle', label: 'Subtitle', type: 'text' },
    { key: 'image', label: 'Picture', type: 'image' },
    { key: 'url', label: 'Opens (when clicked)', type: 'link' }
  ],
  trust_banners_service: [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'subtitle', label: 'Subtitle', type: 'text' },
    { key: 'image', label: 'Picture', type: 'image' },
    { key: 'url', label: 'Opens (when clicked)', type: 'link' }
  ],
  viking_one_section: [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'subtitle', label: 'Subtitle', type: 'text' },
    { key: 'link', label: 'Link Text', type: 'text' },
    { key: 'url', label: 'Opens (when clicked)', type: 'link' },
    { key: 'image', label: 'Picture', type: 'image' },
    { key: 'badge', label: 'Big Accent Badge', type: 'text' },
    { key: 'badgeTextColor', label: 'Badge text colour', type: 'color', palette: TEXT_COLORS },
    { key: 'accentColor', label: 'Badge background colour', type: 'color' }
  ],
  promo_cards: [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'subtitle', label: 'Subtitle', type: 'text' },
    { key: 'link', label: 'Opens (when clicked)', type: 'link' },
    { key: 'badge', label: 'Badge Text', type: 'text' },
    { key: 'image', label: 'Picture', type: 'image' },
    { key: 'bgColor', label: 'Background colour', type: 'color' },
    { key: 'textColor', label: 'Text colour', type: 'select', options: [{val:'text-gray-800', label:'Dark text'}, {val:'text-white', label:'White text'}] }
  ]
}

function VisualListEditor({ title, description, settingKey }) {
  const { settings, saveSetting } = useSiteSettings()
  const [items, setItems] = useState([])
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [expanded, setExpanded] = useState(false)

  const schema = schemas[settingKey]
  const [uploading, setUploading] = useState(0)
  // Bumped when rows are added, removed or moved, so field state follows its row.
  const [revision, setRevision] = useState(0)

  // Depends on this block only: saving another block must not discard edits here.
  const saved = settings?.[settingKey]
  useEffect(() => {
    setItems(saved || defaults[settingKey] || [])
    setRevision(r => r + 1)
  }, [saved, settingKey])

  const changeRows = (rows) => {
    setItems(rows)
    setRevision(r => r + 1)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setStatus(null)
      await saveSetting(settingKey, items)
      setStatus('success')
      setTimeout(() => setStatus(null), 3000)
    } catch (e) {
      console.error(e)
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  // Functional update: an upload finishing later must not undo newer typing.
  const updateItem = (index, key, value) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [key]: value } : item))
  }

  const addItem = () => {
    const defaultObj = {}
    schema.forEach(field => {
      defaultObj[field.key] = field.type === 'checkbox' ? false : ''
    })
    changeRows([...items, defaultObj])
  }

  const removeItem = (index) => {
    changeRows(items.filter((_, i) => i !== index))
  }

  const moveUp = (index) => {
    if (index === 0) return
    const newItems = [...items]
    const temp = newItems[index]
    newItems[index] = newItems[index - 1]
    newItems[index - 1] = temp
    changeRows(newItems)
  }

  const moveDown = (index) => {
    if (index === items.length - 1) return
    const newItems = [...items]
    const temp = newItems[index]
    newItems[index] = newItems[index + 1]
    newItems[index + 1] = temp
    changeRows(newItems)
  }

  return (
    <div className="bg-white rounded-sm border border-gray-200 shadow-sm mb-6 overflow-hidden">
      <div 
        className="flex justify-between items-center p-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <h2 className="text-lg font-bold text-gray-800">{title} <span className="text-gray-400 font-normal text-sm ml-2">({items.length} items)</span></h2>
          {expanded && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
        <div>
          {expanded ? <ChevronUp className="text-gray-500" /> : <ChevronDown className="text-gray-500" />}
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-6 bg-white">
          {items.map((item, idx) => (
            <div key={`${revision}-${idx}`} className="border border-gray-200 p-4 rounded bg-gray-50 relative">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
                <span className="font-bold text-gray-600">Item #{idx + 1}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => moveUp(idx)} className="p-1 hover:bg-gray-200 rounded text-gray-600" title="Move Up"><ChevronUp size={16} /></button>
                  <button onClick={() => moveDown(idx)} className="p-1 hover:bg-gray-200 rounded text-gray-600" title="Move Down"><ChevronDown size={16} /></button>
                  <button onClick={() => removeItem(idx)} className="p-1 hover:bg-red-100 text-red-500 rounded ml-2" title="Remove"><Trash2 size={16} /></button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schema.map(field => (
                  <div key={field.key} className={field.type === 'checkbox' ? 'flex items-center gap-2 mt-4' : ''}>
                    {field.type !== 'checkbox' && <label className="block text-xs font-bold text-gray-700 mb-1">{field.label}</label>}
                    
                    {field.type === 'text' && (
                      <input 
                        type="text" 
                        value={item[field.key] || ''} 
                        onChange={(e) => updateItem(idx, field.key, e.target.value)}
                        className="w-full border border-gray-300 p-2 text-sm rounded bg-white outline-none focus:border-[#00857C]"
                        placeholder={field.label}
                      />
                    )}

                    {field.type === 'image' && (
                      <ImageInput
                        value={item[field.key] || ''}
                        onChange={value => updateItem(idx, field.key, value)}
                        onBusyChange={busy => setUploading(n => n + (busy ? 1 : -1))}
                      />
                    )}

                    {field.type === 'link' && (
                      <LinkInput value={item[field.key] || ''} onChange={value => updateItem(idx, field.key, value)} />
                    )}

                    {field.type === 'color' && (
                      <ColorInput value={item[field.key] || ''} colors={field.palette} onChange={value => updateItem(idx, field.key, value)} />
                    )}

                    {field.type === 'select' && (
                      <select
                        value={item[field.key] || ''}
                        onChange={(e) => updateItem(idx, field.key, e.target.value)}
                        className="w-full border border-gray-300 p-2 text-sm rounded bg-white outline-none focus:border-[#00857C]"
                      >
                        {field.options.map(opt => (
                          <option key={opt.val} value={opt.val}>{opt.label}</option>
                        ))}
                      </select>
                    )}

                    {field.type === 'checkbox' && (
                      <>
                        <input 
                          type="checkbox" 
                          checked={item[field.key] || false}
                          onChange={(e) => updateItem(idx, field.key, e.target.checked)}
                          className="w-4 h-4 text-[#00857C] rounded border-gray-300"
                        />
                        <label className="text-sm font-bold text-gray-700">{field.label}</label>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex gap-4 items-center">
            <button 
              onClick={addItem}
              className="border-2 border-dashed border-gray-300 hover:border-[#00857C] hover:text-[#00857C] text-gray-500 px-4 py-2 rounded font-bold flex items-center gap-2 text-sm transition-colors"
            >
              <Plus size={16} /> Add Custom Item
            </button>
            <div className="flex-1"></div>
            
            {status === 'success' && <span className="text-sm font-bold text-green-600 flex items-center gap-1"><CheckCircle2 size={16}/> Saved!</span>}
            {status === 'error' && <span className="text-sm font-bold text-red-600 flex items-center gap-1"><AlertCircle size={16}/> Failed to save</span>}

            <button 
              onClick={handleSave} 
              disabled={saving || uploading > 0}
              className="bg-[#00857C] hover:bg-[#006B63] disabled:opacity-60 text-white px-6 py-2 rounded-sm font-bold flex items-center gap-2 text-sm"
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminStorefront() {
  const { settings, loading, saveSetting } = useSiteSettings()
  const [activeTab, setActiveTab] = useState('hero')

  const [welcomeBanner, setWelcomeBanner] = useState({ text: '', code: '' })
  const [savingWelcome, setSavingWelcome] = useState(false)

  useEffect(() => {
    if (settings && !loading) {
      if (settings.welcome_banner) setWelcomeBanner(settings.welcome_banner)
    }
  }, [settings, loading])

  const handleSaveWelcomeBanner = async () => {
    setSavingWelcome(true)
    try {
      await saveSetting('welcome_banner', welcomeBanner)
      alert('Welcome banner saved!')
    } catch {
      alert("Failed to save.")
    } finally {
      setSavingWelcome(false)
    }
  }

  const tabs = [
    { id: 'hero', label: 'Hero & Basics' },
    { id: 'banners', label: 'Homepage Banners' },
    { id: 'trust', label: 'Trust & Footer' }
  ]

  if (loading) return <p className="p-8 text-gray-500 font-medium">Loading Storefront CMS Models...</p>

  return (
    <div className="max-w-5xl pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Storefront Content Manager</h1>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-[#00857C] text-[#00857C]' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* --- TAB 1: HERO & BASICS --- */}
      {activeTab === 'hero' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white p-6 rounded-sm border border-gray-200 shadow-sm mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Welcome Banner</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Banner Text</label>
                <input 
                  type="text" 
                  value={welcomeBanner.text || ''} 
                  onChange={e => setWelcomeBanner({...welcomeBanner, text: e.target.value})}
                  className="w-full border border-gray-300 p-2.5 rounded-sm focus:border-[#00857C] outline-none text-sm" 
                  placeholder="Welcome offer: Free delivery..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Voucher Code</label>
                <input 
                  type="text" 
                  value={welcomeBanner.code || ''} 
                  onChange={e => setWelcomeBanner({...welcomeBanner, code: e.target.value})}
                  className="w-full border border-gray-300 p-2.5 rounded-sm focus:border-[#00857C] outline-none text-sm" 
                  placeholder="e.g. WELCOME10"
                />
              </div>
              <button 
                onClick={handleSaveWelcomeBanner} 
                disabled={savingWelcome}
                className="bg-[#00857C] hover:bg-[#006B63] text-white px-6 py-2 rounded-sm font-bold flex items-center gap-2 text-sm"
              >
                <Save size={16} /> {savingWelcome ? 'Saving...' : 'Save Welcome Banner'}
              </button>
            </div>
          </div>

          <VisualListEditor 
            title="Promo Cards" 
            description="The top 3 promotion cards displayed directly below the category grid."
            settingKey="promo_cards" 
          />
          
          <VisualListEditor 
            title="Trust Bar Settings" 
            description="The strip of short service points. Only publish confirmed claims."
            settingKey="trust_bar" 
          />
        </div>
      )}

      {/* --- TAB 2: HOMEPAGE BANNERS --- */}
      {activeTab === 'banners' && (
        <div className="space-y-6 animate-in fade-in">
          <p className="text-sm text-gray-500">
            Each block below stays hidden on the storefront until it has at least one saved item.
          </p>

          <VisualListEditor
            title="Hero Offer Banners"
            description="The two large banners at the top of the homepage. Only enter real offers and prices."
            settingKey="hero_banners"
          />

          <VisualListEditor
            title="Explore Our Range (tiles)"
            description="The row of range tiles on the homepage. Add a red badge only for a real offer."
            settingKey="deals_section"
          />

          <VisualListEditor
            title="Top Recommendations"
            description="The round recommendation tiles on the homepage (the 'Recommendations' sheet of the product data template)."
            settingKey="top_recommendations"
          />

          <VisualListEditor
            title="Free Gifts Banner"
            description="Gift images on the homepage strip and the category page banner."
            settingKey="free_gifts_banner"
          />
        </div>
      )}

      {/* --- TAB 3: TRUST & FOOTER --- */}
      {activeTab === 'trust' && (
        <div className="space-y-6 animate-in fade-in">
          <FooterEditor />

          <VisualListEditor
            title="Delivery Trust Banners" 
            description="First row of homepage information banners."
            settingKey="trust_banners_delivery" 
          />

          <VisualListEditor 
            title="Service Trust Banners" 
            description="Second row of homepage information banners."
            settingKey="trust_banners_service" 
          />

          <VisualListEditor 
            title="Feature Banners" 
            description="The two large feature banners."
            settingKey="viking_one_section" 
          />
        </div>
      )}

    </div>
  )
}
