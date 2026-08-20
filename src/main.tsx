import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
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
  file?: File;
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
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET ?? "album-photos";
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
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

function serializeAlbum(album: Album): Album {
  return {
    ...album,
    photos: album.photos.map(({ file: _file, ...photo }) => photo),
  };
}

function rowToAlbum(row: AlbumRow): Album {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    destination: row.destination,
    dates: row.dates,
    description: row.description ?? "",
    story: row.story ?? "",
    favoriteMemory: row.favorite_memory ?? "",
    people: row.people ?? "",
    photos: row.photos ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function albumToRow(album: Album, ownerId: string) {
  return {
    id: album.id,
    owner_id: ownerId,
    slug: album.slug,
    title: album.title,
    destination: album.destination,
    dates: album.dates,
    description: album.description,
    story: album.story,
    favorite_memory: album.favoriteMemory,
    people: album.people,
    photos: serializeAlbum(album).photos,
    is_public: true,
    updated_at: album.updatedAt,
  };
}

type AlbumRow = {
  id: string;
  slug: string;
  title: string;
  destination: string;
  dates: string;
  description: string | null;
  story: string | null;
  favorite_memory: string | null;
  people: string | null;
  photos: Photo[];
  created_at: string;
  updated_at: string;
};

async function ensureAnonymousSession() {
  if (!supabase) return "";
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (sessionData.session) return sessionData.session.user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.user?.id ?? "";
}

async function fetchRemoteAlbums() {
  if (!supabase) return null;
  const userId = await ensureAnonymousSession();
  const { data, error } = await supabase
    .from("albums")
    .select("id, slug, title, destination, dates, description, story, favorite_memory, people, photos, created_at, updated_at")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data.map(rowToAlbum);
}

async function fetchRemoteAlbumBySlug(slug: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("albums")
    .select("id, slug, title, destination, dates, description, story, favorite_memory, people, photos, created_at, updated_at")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToAlbum(data) : null;
}

async function uploadPendingPhotos(album: Album) {
  if (!supabase) return serializeAlbum(album);
  const userId = await ensureAnonymousSession();

  const photos = await Promise.all(
    album.photos.map(async (photo) => {
      if (!photo.file) return photo;
      const safeName = photo.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/(^-|-$)/g, "");
      const path = `${userId}/${album.id}/${photo.id}-${safeName || "photo.jpg"}`;
      const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(path, photo.file, {
        cacheControl: "31536000",
        contentType: photo.file.type,
        upsert: true,
      });

      if (error) throw error;
      const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
      return {
        id: photo.id,
        name: photo.name,
        dataUrl: data.publicUrl,
        isCover: photo.isCover,
      };
    }),
  );

  return serializeAlbum({ ...album, photos });
}

async function saveRemoteAlbum(album: Album) {
  if (!supabase) return album;
  const userId = await ensureAnonymousSession();
  const uploadedAlbum = await uploadPendingPhotos(album);
  const { error } = await supabase.from("albums").upsert(albumToRow(uploadedAlbum, userId), { onConflict: "id" });
  if (error) throw error;
  return uploadedAlbum;
}

async function deleteRemoteAlbum(id: string) {
  if (!supabase) return;
  await ensureAnonymousSession();
  const { error } = await supabase.from("albums").delete().eq("id", id);
  if (error) throw error;
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
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const [syncStatus, setSyncStatus] = useState(supabase ? "Connecting to cloud storage..." : "Local preview mode");

  useEffect(() => {
    const onRoute = () => setRoute(getRoute());
    window.addEventListener("popstate", onRoute);
    return () => window.removeEventListener("popstate", onRoute);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(albums.map(serializeAlbum)));
  }, [albums]);

  useEffect(() => {
    let active = true;

    async function loadRemoteAlbums() {
      if (!supabase) return;
      try {
        const remoteAlbums = await fetchRemoteAlbums();
        if (!active || !remoteAlbums) return;
        setAlbums(remoteAlbums.length ? remoteAlbums : []);
        setSyncStatus("Cloud storage connected");
      } catch (error) {
        console.error(error);
        if (active) setSyncStatus("Cloud storage unavailable. Using this browser only.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadRemoteAlbums();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (route.name !== "album" || albums.some((album) => album.slug === route.slug)) return;
    let active = true;

    async function loadPublicAlbum() {
      try {
        const album = await fetchRemoteAlbumBySlug(route.name === "album" ? route.slug : "");
        if (!active || !album) return;
        setAlbums((current) => [album, ...current.filter((item) => item.id !== album.id)]);
      } catch (error) {
        console.error(error);
      }
    }

    loadPublicAlbum();
    return () => {
      active = false;
    };
  }, [albums, route]);

  const saveAlbum = async (album: Album) => {
    const savedAlbum = await saveRemoteAlbum(album);
    setAlbums((current) => {
      const exists = current.some((item) => item.id === savedAlbum.id);
      return exists ? current.map((item) => (item.id === savedAlbum.id ? savedAlbum : item)) : [savedAlbum, ...current];
    });
    navigate({ name: "dashboard" });
  };

  const deleteAlbum = async (id: string) => {
    await deleteRemoteAlbum(id);
    setAlbums((current) => current.filter((album) => album.id !== id));
  };

  const activeAlbum = route.name === "editor" && route.id ? albums.find((album) => album.id === route.id) : undefined;
  const publicAlbum = route.name === "album" ? albums.find((album) => album.slug === route.slug) : undefined;

  return (
    <>
      <Header route={route} />
      <main>
        {route.name === "dashboard" && <Dashboard albums={albums} onDelete={deleteAlbum} isLoading={isLoading} syncStatus={syncStatus} />}
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

function Dashboard({ albums, onDelete, isLoading, syncStatus }: { albums: Album[]; onDelete: (id: string) => Promise<void>; isLoading: boolean; syncStatus: string }) {
  return (
    <section className="page-shell dashboard">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Your Albums</h1>
          <p className="sync-status">{syncStatus}</p>
        </div>
        <button className="primary" onClick={() => navigate({ name: "editor" })}><Plus size={17} /> New album</button>
      </div>
      {isLoading ? (
        <div className="empty-state">
          <UploadCloud size={42} />
          <h2>Loading albums</h2>
          <p>Checking cloud storage for your saved trips.</p>
        </div>
      ) : albums.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="album-grid">
          {albums.map((album) => <AlbumCard key={album.id} album={album} onDelete={onDelete} />)}
        </div>
      )}
    </section>
  );
}

function AlbumCard({ album, onDelete }: { album: Album; onDelete: (id: string) => Promise<void> }) {
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
        <button className="danger" onClick={() => void onDelete(album.id)}><Trash2 size={16} /> Delete</button>
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

function AlbumEditor({ existing, albums, onSave }: { existing?: Album; albums: Album[]; onSave: (album: Album) => Promise<void> }) {
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
  const [saving, setSaving] = useState(false);
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
            reader.onload = () => resolve({ id: createId(), name: file.name, dataUrl: String(reader.result), isCover: photos.length === 0, file });
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

  const save = async () => {
    if (!title.trim() || !destination.trim() || !dates.trim()) {
      setError("Please complete the required trip details.");
      return;
    }
    if (photos.length === 0) {
      setError("Add at least one cover or gallery photo.");
      return;
    }
    const now = new Date().toISOString();
    setSaving(true);
    setError("");

    try {
      await onSave({
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
    } catch (error) {
      console.error(error);
      setError("Could not save the album. Check your storage settings and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page-shell editor">
      <button className="back-button" onClick={() => navigate({ name: "dashboard" })}><ArrowLeft size={16} /> Back to dashboard</button>
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Album studio</p>
          <h1>{existing ? "Edit album" : "Create a travel album"}</h1>
        </div>
        <button className="primary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save album"}</button>
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
