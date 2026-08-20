import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  GripVertical,
  ImagePlus,
  MapPin,
  Maximize2,
  Nfc,
  Plus,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import "./styles.css";

type Photo = {
  id: string;
  name: string;
  dataUrl: string;
  isCover?: boolean;
};

type Album = {
  id: string;
  slug: string;
  title: string;
  destination: string;
  dates: string;
  description: string;
  story: string;
  favoriteMemory: string;
  people: string;
  photos: Photo[];
  createdAt: string;
  updatedAt: string;
};

type View =
  | { name: "dashboard" }
  | { name: "editor"; id?: string }
  | { name: "album"; slug: string };

const STORAGE_KEY = "frametap/albums";
const BASE_PATH = import.meta.env.BASE_URL;
const SAMPLE_PHOTOS: Photo[] = [
  {
    id: "sample-1",
    name: "clifftop.jpg",
    isCover: true,
    dataUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=85",
  },
  {
    id: "sample-2",
    name: "old-town.jpg",
    dataUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "sample-3",
    name: "train-window.jpg",
    dataUrl:
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "sample-4",
    name: "market.jpg",
    dataUrl:
      "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=85",
  },
];

const SAMPLE_ALBUM: Album = {
  id: "sample-summer-italy",
  slug: "summer-in-italy",
  title: "Summer in Italy",
  destination: "Genoa, Italy",
  dates: "July 2022",
  description: "A week of sunsets, train rides and too much focaccia.",
  story:
    "We kept following narrow streets until the city opened into salt air, gold light, and little tables full of cold glasses.",
  favoriteMemory: "Swimming after dinner while the last ferry lights crossed the harbor.",
  people: "Mia, Tomas, Elena",
  photos: SAMPLE_PHOTOS,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function createId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function slugify(value: string) {
  const base = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || `album-${Date.now()}`;
}

function readAlbums(): Album[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [SAMPLE_ALBUM];
    const parsed = JSON.parse(raw) as Album[];
    return parsed.length ? parsed : [SAMPLE_ALBUM];
  } catch {
    return [SAMPLE_ALBUM];
  }
}

function getRoute(): View {
  const path = window.location.pathname.replace(new RegExp(`^${BASE_PATH}`), "/");
  if (path.startsWith("/album/")) return { name: "album", slug: path.split("/album/")[1] };
  const hash = window.location.hash.replace("#", "");
  if (hash.startsWith("editor/")) return { name: "editor", id: hash.split("/")[1] };
  if (hash === "new") return { name: "editor" };
  return { name: "dashboard" };
}

function navigate(view: View) {
  if (view.name === "album") {
    window.history.pushState({}, "", `${BASE_PATH}album/${view.slug}`);
  } else {
    const hash = view.name === "editor" ? (view.id ? `#editor/${view.id}` : "#new") : "#dashboard";
    window.history.pushState({}, "", `${BASE_PATH}${hash}`);
  }
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getAlbumUrl(slug: string) {
  return `${window.location.origin}${BASE_PATH}album/${slug}`;
}

function coverOf(album: Album) {
  return album.photos.find((photo) => photo.isCover) ?? album.photos[0];
}

function App() {
  const [route, setRoute] = useState<View>(getRoute);
  const [albums, setAlbums] = useState<Album[]>(readAlbums);

  useEffect(() => {
    const onRoute = () => setRoute(getRoute());
    window.addEventListener("popstate", onRoute);
    return () => window.removeEventListener("popstate", onRoute);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(albums));
  }, [albums]);

  const saveAlbum = (album: Album) => {
    setAlbums((current) => {
      const exists = current.some((item) => item.id === album.id);
      return exists ? current.map((item) => (item.id === album.id ? album : item)) : [album, ...current];
    });
    navigate({ name: "dashboard" });
  };

  const deleteAlbum = (id: string) => {
    setAlbums((current) => current.filter((album) => album.id !== id));
  };

  const activeAlbum = route.name === "editor" && route.id ? albums.find((album) => album.id === route.id) : undefined;
  const publicAlbum = route.name === "album" ? albums.find((album) => album.slug === route.slug) : undefined;

  return (
    <>
      <Header route={route} />
      <main>
        {route.name === "dashboard" && <Dashboard albums={albums} onDelete={deleteAlbum} />}
        {route.name === "editor" && <AlbumEditor existing={activeAlbum} albums={albums} onSave={saveAlbum} />}
        {route.name === "album" && <PublicAlbum album={publicAlbum} />}
      </main>
    </>
  );
}

function Header({ route }: { route: View }) {
  return (
    <header className="site-header">
      <button className="brand" onClick={() => navigate({ name: "dashboard" })} aria-label="Go to dashboard">
        <span>FrameTap</span>
      </button>
      <nav aria-label="Main navigation">
        <button className={route.name === "dashboard" ? "active" : ""} onClick={() => navigate({ name: "dashboard" })}>Dashboard</button>
        <button className="nav-cta" onClick={() => navigate({ name: "editor" })}><Plus size={16} /> Create</button>
      </nav>
    </header>
  );
}

function Dashboard({ albums, onDelete }: { albums: Album[]; onDelete: (id: string) => void }) {
  return (
    <section className="page-shell dashboard">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Your Albums</h1>
        </div>
        <button className="primary" onClick={() => navigate({ name: "editor" })}><Plus size={17} /> New album</button>
      </div>
      {albums.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="album-grid">
          {albums.map((album) => <AlbumCard key={album.id} album={album} onDelete={onDelete} />)}
        </div>
      )}
    </section>
  );
}

function AlbumCard({ album, onDelete }: { album: Album; onDelete: (id: string) => void }) {
  const [copied, setCopied] = useState(false);
  const cover = coverOf(album);
  const url = getAlbumUrl(album.slug);
  const copyUrl = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <article className="album-card">
      <button className="album-cover" onClick={() => navigate({ name: "album", slug: album.slug })}>
        {cover ? <img src={cover.dataUrl} alt="" /> : <div className="photo-placeholder" />}
      </button>
      <div className="album-meta">
        <h2>{album.title}</h2>
        <p><MapPin size={15} /> {album.destination}</p>
        <p>{album.dates} · {album.photos.length} photos</p>
        <code>{url}</code>
      </div>
      <div className="card-actions">
        <button onClick={() => navigate({ name: "album", slug: album.slug })}><ExternalLink size={16} /> View album</button>
        <button onClick={() => navigate({ name: "editor", id: album.id })}><Edit3 size={16} /> Edit</button>
        <button onClick={copyUrl}>{copied ? <Check size={16} /> : <Copy size={16} />} Copy NFC URL</button>
        <button className="danger" onClick={() => onDelete(album.id)}><Trash2 size={16} /> Delete</button>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <ImagePlus size={42} />
      <h2>No albums yet</h2>
      <p>Create your first travel album and connect it to a tappable NFC link.</p>
      <button className="primary" onClick={() => navigate({ name: "editor" })}>Create your album</button>
    </div>
  );
}

function AlbumEditor({ existing, albums, onSave }: { existing?: Album; albums: Album[]; onSave: (album: Album) => void }) {
  const [title, setTitle] = useState(existing?.title ?? "");
  const [destination, setDestination] = useState(existing?.destination ?? "");
  const [dates, setDates] = useState(existing?.dates ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [story, setStory] = useState(existing?.story ?? "");
  const [favoriteMemory, setFavoriteMemory] = useState(existing?.favoriteMemory ?? "");
  const [people, setPeople] = useState(existing?.people ?? "");
  const [photos, setPhotos] = useState<Photo[]>(existing?.photos ?? []);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement | null>(null);

  const slug = useMemo(() => {
    const base = existing?.slug ?? slugify(title);
    const taken = albums.some((album) => album.slug === base && album.id !== existing?.id);
    return taken ? `${base}-${String(createId()).slice(0, 5)}` : base;
  }, [albums, existing?.id, existing?.slug, title]);

  const addFiles = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length) return;
    setUploading(true);
    const loaded = await Promise.all(
      imageFiles.map(
        (file) =>
          new Promise<Photo>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ id: createId(), name: file.name, dataUrl: String(reader.result), isCover: photos.length === 0 });
            reader.onerror = () => reject(new Error(`Could not load ${file.name}`));
            reader.readAsDataURL(file);
          }),
      ),
    );
    setPhotos((current) => {
      const next = [...current, ...loaded];
      if (!next.some((photo) => photo.isCover) && next[0]) next[0].isCover = true;
      return next;
    });
    setUploading(false);
  };

  const save = () => {
    if (!title.trim() || !destination.trim() || !dates.trim()) {
      setError("Please complete the required trip details.");
      return;
    }
    if (photos.length === 0) {
      setError("Add at least one cover or gallery photo.");
      return;
    }
    const now = new Date().toISOString();
    onSave({
      id: existing?.id ?? createId(),
      slug,
      title: title.trim(),
      destination: destination.trim(),
      dates: dates.trim(),
      description: description.trim(),
      story: story.trim(),
      favoriteMemory: favoriteMemory.trim(),
      people: people.trim(),
      photos,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  };

  return (
    <section className="page-shell editor">
      <button className="back-button" onClick={() => navigate({ name: "dashboard" })}><ArrowLeft size={16} /> Back to dashboard</button>
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Album studio</p>
          <h1>{existing ? "Edit album" : "Create a travel album"}</h1>
        </div>
        <button className="primary" onClick={save}>Save album</button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="editor-layout">
        <form className="paper-panel" onSubmit={(event) => event.preventDefault()}>
          <Field label="Album title" required value={title} onChange={setTitle} placeholder="Summer in Italy" />
          <Field label="Destination" required value={destination} onChange={setDestination} placeholder="Genoa, Italy" />
          <Field label="Travel dates" required value={dates} onChange={setDates} placeholder="July 2022" />
          <Field label="Description" value={description} onChange={setDescription} placeholder="A week of sunsets, train rides and too much focaccia." textarea />
          <Field label="Short story" value={story} onChange={setStory} placeholder="Write the little narrative behind this trip." textarea />
          <Field label="Favorite memory" value={favoriteMemory} onChange={setFavoriteMemory} placeholder="The moment you want everyone to feel." textarea />
          <Field label="People who were there" value={people} onChange={setPeople} placeholder="Mia, Tomas, Elena" />
        </form>
        <div className="paper-panel">
          <div className="upload-heading">
            <div>
              <h2>Gallery photos</h2>
              <p>Drag, preview, reorder, choose a cover, and remove photos.</p>
            </div>
            <button onClick={() => fileInput.current?.click()}><UploadCloud size={17} /> Select photos</button>
          </div>
          <input ref={fileInput} className="sr-only" type="file" accept="image/*" multiple onChange={(event) => event.target.files && addFiles(event.target.files)} />
          <button
            className={`dropzone ${dragging ? "dragging" : ""}`}
            onClick={() => fileInput.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              addFiles(event.dataTransfer.files);
            }}
          >
            <ImagePlus size={34} />
            <strong>{uploading ? "Preparing previews..." : "Drop your travel photos here"}</strong>
            <span>Multiple image selection supported</span>
            {uploading && <i className="upload-progress" />}
          </button>
          <PhotoManager photos={photos} setPhotos={setPhotos} />
        </div>
      </div>
    </section>
  );
}

function Field({ label, value, onChange, placeholder, required, textarea }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; required?: boolean; textarea?: boolean }) {
  return (
    <label className="field">
      <span>{label}{required && <b>*</b>}</span>
      {textarea ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      )}
    </label>
  );
}

function PhotoManager({ photos, setPhotos }: { photos: Photo[]; setPhotos: React.Dispatch<React.SetStateAction<Photo[]>> }) {
  const movePhoto = (index: number, direction: -1 | 1) => {
    setPhotos((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
  if (!photos.length) return <p className="mini-empty">No photos yet. Add a cover photo and a few memories.</p>;
  return (
    <div className="photo-manager">
      {photos.map((photo, index) => (
        <article key={photo.id} className="photo-tile">
          <img src={photo.dataUrl} alt={photo.name} />
          <div>
            <span><GripVertical size={15} /> {photo.name}</span>
            <div className="tile-actions">
              <button onClick={() => movePhoto(index, -1)} disabled={index === 0}>Up</button>
              <button onClick={() => movePhoto(index, 1)} disabled={index === photos.length - 1}>Down</button>
              <button onClick={() => setPhotos((current) => current.map((item) => ({ ...item, isCover: item.id === photo.id })))}>{photo.isCover ? "Cover" : "Set cover"}</button>
              <button onClick={() => setPhotos((current) => current.filter((item) => item.id !== photo.id))}><Trash2 size={15} /></button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function PublicAlbum({ album }: { album?: Album }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  if (!album) {
    return (
      <section className="page-shell">
        <EmptyState />
      </section>
    );
  }
  const cover = coverOf(album);
  return (
    <>
      <section className="public-hero">
        <div className="public-hero-image">{cover && <img src={cover.dataUrl} alt="" />}</div>
        <div className="public-hero-copy">
          <p className="eyebrow"><MapPin size={15} /> {album.destination} · {album.dates}</p>
          <h1>{album.title}</h1>
          <p>{album.description}</p>
          <span>{album.photos.length} photographs</span>
        </div>
      </section>
      <section className="public-story section">
        <div>
          <p className="eyebrow">Travel diary</p>
          <h2>{album.favoriteMemory || "A trip worth opening again."}</h2>
        </div>
        <p>{album.story || "A collection of moments held between a printed photograph and the little tap that brings everything back."}</p>
        {album.people && <p className="people-line">With {album.people}</p>}
      </section>
      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Gallery</p>
          <h2>Memories arranged like pages.</h2>
        </div>
        <div className="masonry-gallery">
          {album.photos.map((photo, index) => (
            <button key={photo.id} className="memory-photo" onClick={() => setLightboxIndex(index)}>
              <img src={photo.dataUrl} alt={photo.name} />
              <Maximize2 size={18} />
            </button>
          ))}
        </div>
      </section>
      <NfcPanel album={album} />
      {lightboxIndex !== null && <Lightbox album={album} index={lightboxIndex} setIndex={setLightboxIndex} />}
    </>
  );
}

function NfcPanel({ album }: { album: Album }) {
  const [copied, setCopied] = useState(false);
  const url = getAlbumUrl(album.slug);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;
  const copyUrl = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <section className="section nfc-panel">
      <div>
        <p className="eyebrow"><Nfc size={15} /> Your NFC link</p>
        <h2>Write this URL to your NFC tag.</h2>
        <code>{url}</code>
        <p>Copy this link and write it to your NFC tag using an app such as NFC Tools.</p>
        <div className="hero-actions">
          <button className="primary" onClick={copyUrl}>{copied ? <Check size={17} /> : <Copy size={17} />} Copy URL</button>
          <button className="secondary" onClick={() => navigate({ name: "album", slug: album.slug })}><ExternalLink size={17} /> Open album</button>
          <a className="button-link" href={qrSrc} download={`qr-${album.slug}.png`}><Download size={17} /> QR Code</a>
        </div>
      </div>
      <div className="qr-card">
        <img src={qrSrc} alt={`QR code for ${album.title}`} />
      </div>
    </section>
  );
}

function Lightbox({ album, index, setIndex }: { album: Album; index: number; setIndex: (index: number | null) => void }) {
  const photo = album.photos[index];
  return (
    <div className="lightbox" role="dialog" aria-modal="true">
      <button className="lightbox-close" onClick={() => setIndex(null)} aria-label="Close"><X /></button>
      <button className="lightbox-nav" onClick={() => setIndex(Math.max(index - 1, 0))} disabled={index === 0}>Previous</button>
      <img src={photo.dataUrl} alt={photo.name} />
      <button className="lightbox-nav" onClick={() => setIndex(Math.min(index + 1, album.photos.length - 1))} disabled={index === album.photos.length - 1}>Next</button>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
