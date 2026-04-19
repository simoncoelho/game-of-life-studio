import ctypes
import random
import sys
import tkinter as tk
from tkinter import colorchooser, filedialog, ttk

from PIL import Image, ImageColor, ImageDraw


RULES = {
    "Conway": {
        "code": "B3/S23",
        "birth": {3},
        "survive": {2, 3},
        "description": "Classic balanced Life with gliders, oscillators, and stable structures.",
        "density": 0.23,
    },
    "HighLife": {
        "code": "B36/S23",
        "birth": {3, 6},
        "survive": {2, 3},
        "description": "Conway plus a birth on six neighbors, which produces fast self-replicators.",
        "density": 0.18,
    },
    "Seeds": {
        "code": "B2/S",
        "birth": {2},
        "survive": set(),
        "description": "No cell survives; everything is driven by explosive two-neighbor births.",
        "density": 0.08,
    },
    "Day & Night": {
        "code": "B3678/S34678",
        "birth": {3, 6, 7, 8},
        "survive": {3, 4, 6, 7, 8},
        "description": "A dense, reversible rule with dramatic blobs and mirrored dark-light behavior.",
        "density": 0.34,
    },
    "Maze": {
        "code": "B3/S12345",
        "birth": {3},
        "survive": {1, 2, 3, 4, 5},
        "description": "Tends to grow long labyrinth-like corridors that settle into maze textures.",
        "density": 0.22,
    },
    "Anneal": {
        "code": "B4678/S35678",
        "birth": {4, 6, 7, 8},
        "survive": {3, 5, 6, 7, 8},
        "description": "Smooths noisy seeds into thick organic regions with slower visual cooling.",
        "density": 0.42,
    },
    "Replicator": {
        "code": "B1357/S1357",
        "birth": {1, 3, 5, 7},
        "survive": {1, 3, 5, 7},
        "description": "Highly active parity-based rule that throws out mirrored diamond patterns.",
        "density": 0.18,
    },
    "Coral": {
        "code": "B3/S45678",
        "birth": {3},
        "survive": {4, 5, 6, 7, 8},
        "description": "Dense coral-like accretion that forms branching rims and porous interiors.",
        "density": 0.3,
    },
    "Coagulation": {
        "code": "B378/S235678",
        "birth": {3, 7, 8},
        "survive": {2, 3, 5, 6, 7, 8},
        "description": "Clots and spreads into blotchy colonies with thick membranes and hollows.",
        "density": 0.38,
    },
    "Serviettes": {
        "code": "B234/S",
        "birth": {2, 3, 4},
        "survive": set(),
        "description": "Aggressive expanding lacework that reads like fungal hyphae and spores.",
        "density": 0.06,
    },
}


PRESETS = {
    "Classic": {
        "background": "#0b1020",
        "cell": "#7dd3fc",
        "grid": "#18243f",
        "trail": "#10182b",
        "density": 0.23,
        "speed": 9,
        "wrap": True,
    },
    "Sunset": {
        "background": "#1c0f13",
        "cell": "#ff8a5b",
        "grid": "#34212a",
        "trail": "#24161c",
        "density": 0.18,
        "speed": 11,
        "wrap": True,
    },
    "Forest": {
        "background": "#08140d",
        "cell": "#7ddf64",
        "grid": "#153020",
        "trail": "#102016",
        "density": 0.2,
        "speed": 8,
        "wrap": False,
    },
    "Monochrome": {
        "background": "#121212",
        "cell": "#f3f4f6",
        "grid": "#232323",
        "trail": "#191919",
        "density": 0.14,
        "speed": 7,
        "wrap": True,
    },
    "Petri": {
        "background": "#0c1010",
        "cell": "#d8ffe1",
        "grid": "#1b2624",
        "trail": "#16332b",
        "density": 0.12,
        "speed": 6,
        "wrap": False,
    },
    "Mycelium": {
        "background": "#120f14",
        "cell": "#e7e0cf",
        "grid": "#261f2a",
        "trail": "#3c2a37",
        "density": 0.08,
        "speed": 5,
        "wrap": False,
    },
    "Biofilm": {
        "background": "#071310",
        "cell": "#8ff7b2",
        "grid": "#112822",
        "trail": "#194b39",
        "density": 0.3,
        "speed": 7,
        "wrap": True,
    },
}


GROWTH_SCENES = {
    "Bacterial Bloom": {
        "rule": "Coagulation",
        "preset": "Petri",
        "density": 0.34,
        "speed": 5,
        "fade": 0.32,
        "grid_alpha": 0.1,
        "cell_size": 7,
        "show_grid": False,
        "description": "Soft petri-dish bloom with pooling colony edges and slow radial thickening.",
    },
    "Fungal Mycelium": {
        "rule": "Serviettes",
        "preset": "Mycelium",
        "density": 0.07,
        "speed": 4,
        "fade": 0.48,
        "grid_alpha": 0.06,
        "cell_size": 6,
        "show_grid": False,
        "description": "Fine branching strands and spore-like bursts for a mycelial network look.",
    },
    "Coral Colony": {
        "rule": "Coral",
        "preset": "Biofilm",
        "density": 0.26,
        "speed": 6,
        "fade": 0.26,
        "grid_alpha": 0.08,
        "cell_size": 7,
        "show_grid": False,
        "description": "Chunky porous growth that feels like marine coral or mineral accretion.",
    },
    "Mold Plate": {
        "rule": "Maze",
        "preset": "Petri",
        "density": 0.24,
        "speed": 4,
        "fade": 0.4,
        "grid_alpha": 0.05,
        "cell_size": 6,
        "show_grid": False,
        "description": "Creeping plate growth with darker channels and creeping mold-front textures.",
    },
}


FONT_5X7 = {
    "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    "B": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    "C": ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
    "D": ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    "F": ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
    "G": ["01111", "10000", "10000", "10111", "10001", "10001", "01110"],
    "H": ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    "I": ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    "J": ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
    "K": ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
    "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    "M": ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    "N": ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    "P": ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    "Q": ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
    "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    "U": ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    "V": ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
    "W": ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
    "X": ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
    "Y": ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
    "Z": ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
    "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
    "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
    "3": ["11110", "00001", "00001", "00110", "00001", "00001", "11110"],
    "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
    "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
    "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
    "7": ["11111", "00001", "00010", "00100", "01000", "10000", "10000"],
    "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
    "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
    " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
    "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
    "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
    ".": ["00000", "00000", "00000", "00000", "00000", "00110", "00110"],
    ",": ["00000", "00000", "00000", "00000", "00110", "00110", "00100"],
    "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
    "_": ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
    ":": ["00000", "00110", "00110", "00000", "00110", "00110", "00000"],
    "/": ["00001", "00010", "00100", "01000", "10000", "00000", "00000"],
}


STAMP_PATTERNS = {
    "Brush": [[1]],
    "Block": [[1, 1], [1, 1]],
    "Glider": [[0, 1, 0], [0, 0, 1], [1, 1, 1]],
    "Cross": [[0, 1, 0], [1, 1, 1], [0, 1, 0]],
    "Diamond": [[0, 1, 0], [1, 1, 1], [0, 1, 0]],
    "Exploder": [[1, 0, 1], [1, 0, 1], [1, 0, 1], [1, 0, 1], [1, 0, 1]],
}


class ToolTip:
    def __init__(self, widget, text: str) -> None:
        self.widget = widget
        self.text = text
        self.tip_window = None
        self.widget.bind("<Enter>", self.show_tip, add="+")
        self.widget.bind("<Leave>", self.hide_tip, add="+")

    def show_tip(self, _event=None) -> None:
        if self.tip_window or not self.text:
            return
        x = self.widget.winfo_rootx() + 16
        y = self.widget.winfo_rooty() + self.widget.winfo_height() + 8
        self.tip_window = tk.Toplevel(self.widget)
        self.tip_window.wm_overrideredirect(True)
        self.tip_window.wm_geometry(f"+{x}+{y}")
        self.tip_window.configure(bg="#111315")
        label = tk.Label(
            self.tip_window,
            text=self.text,
            bg="#111315",
            fg="#f3f4f6",
            padx=10,
            pady=6,
            justify="left",
            wraplength=260,
            font=("Segoe UI", 9),
        )
        label.pack()

    def hide_tip(self, _event=None) -> None:
        if self.tip_window:
            self.tip_window.destroy()
            self.tip_window = None


class LifeApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Conway's Game of Life Studio")
        self.root.geometry("1440x920")
        self.root.minsize(1120, 760)
        self.root.configure(bg="#1a1c1f")

        self.running = False
        self.job = None
        self.generation = 0
        self.live_cells = 0
        self.grid = []
        self.previous_grid = []
        self.drag_state = None
        self.scene_overrides = {}
        self.section_bodies = {}
        self.section_shells = {}
        self.section_open = {}
        self.sidebar_hovered = False
        self.tooltips = []
        self.preview_recording = False
        self.preview_play_direction = 0
        self.preview_frames = []
        self.preview_duration = 80
        self.preview_frame_index_var = tk.IntVar(value=0)
        self.preview_status_var = tk.StringVar(value="Build a scene, then record a preview run.")

        self.rows_var = tk.IntVar(value=72)
        self.cols_var = tk.IntVar(value=120)
        self.cell_size_var = tk.IntVar(value=8)
        self.speed_var = tk.IntVar(value=9)
        self.random_density_var = tk.DoubleVar(value=0.23)
        self.fade_var = tk.DoubleVar(value=0.18)
        self.grid_alpha_var = tk.DoubleVar(value=0.36)
        self.text_scale_var = tk.IntVar(value=2)
        self.text_offset_x_var = tk.IntVar(value=0)
        self.text_offset_y_var = tk.IntVar(value=0)
        self.gif_overlay_text_var = tk.BooleanVar(value=False)
        self.gif_overlay_color_mode_var = tk.StringVar(value="Same as Seed")
        self.gif_overlay_color_var = tk.StringVar(value="#ffffff")
        self.gif_overlay_opacity_var = tk.DoubleVar(value=1.0)
        self.gif_frames_var = tk.IntVar(value=90)
        self.gif_step_var = tk.IntVar(value=1)
        self.gif_scale_var = tk.IntVar(value=2)
        self.gif_fps_var = tk.IntVar(value=16)
        self.gif_filename_var = tk.StringVar(value="life-export.gif")
        self.paint_tool_var = tk.StringVar(value="Brush")
        self.wrap_var = tk.BooleanVar(value=True)
        self.show_grid_var = tk.BooleanVar(value=True)
        self.preset_var = tk.StringVar(value="Classic")
        self.rule_var = tk.StringVar(value="Conway")
        self.scene_var = tk.StringVar(value="Bacterial Bloom")
        self.text_seed_var = tk.StringVar(value="GROW")
        self.birth_var = tk.StringVar(value=RULES["Conway"]["code"].split("/")[0][1:])
        self.survive_var = tk.StringVar(value=RULES["Conway"]["code"].split("/")[1][1:])
        self.background_var = tk.StringVar(value=PRESETS["Classic"]["background"])
        self.cell_var = tk.StringVar(value=PRESETS["Classic"]["cell"])
        self.grid_var = tk.StringVar(value=PRESETS["Classic"]["grid"])
        self.trail_var = tk.StringVar(value=PRESETS["Classic"]["trail"])

        self._configure_style()
        self._build_layout()
        self.apply_preset("Classic")
        self.apply_rule_preset("Conway")
        self.apply_growth_scene("Bacterial Bloom")
        self._apply_window_theme()
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)

    def _configure_style(self) -> None:
        style = ttk.Style()
        style.theme_use("clam")
        style.configure(".", background="#1a1c1f", foreground="#e5e7eb", font=("Segoe UI", 10))
        style.configure("Panel.TFrame", background="#1a1c1f")
        style.configure("Card.TFrame", background="#24272b")
        style.configure("CardBody.TFrame", background="#24272b")
        style.configure("Header.TLabel", background="#1a1c1f", foreground="#f5f7fa", font=("Segoe UI Semibold", 20))
        style.configure("Subtle.TLabel", background="#1a1c1f", foreground="#8b949e", font=("Segoe UI", 9))
        style.configure("CardSubtle.TLabel", background="#24272b", foreground="#8b949e", font=("Segoe UI", 9))
        style.configure("Section.TLabel", background="#24272b", foreground="#f5f7fa", font=("Segoe UI Semibold", 11))
        style.configure("Value.TLabel", background="#24272b", foreground="#7dd3fc", font=("Consolas", 10))
        style.configure("Primary.TButton", background="#3b82f6", foreground="white", borderwidth=0, padding=(12, 8))
        style.map(
            "Primary.TButton",
            background=[("active", "#4a8df7"), ("pressed", "#2563eb")],
            foreground=[("disabled", "#b8c0cc")],
        )
        style.configure("Secondary.TButton", background="#2e3238", foreground="#e5e7eb", borderwidth=0, padding=(12, 8))
        style.map("Secondary.TButton", background=[("active", "#373c43"), ("pressed", "#262a30")])
        style.configure("Toggle.TCheckbutton", background="#24272b", foreground="#e5e7eb")
        style.map("Toggle.TCheckbutton", background=[("active", "#24272b")])
        style.configure("SectionToggle.TButton", background="#24272b", foreground="#f5f7fa", borderwidth=0, padding=(0, 0))
        style.map("SectionToggle.TButton", background=[("active", "#24272b"), ("pressed", "#24272b")])
        style.configure(
            "Studio.Horizontal.TScale",
            background="#24272b",
            troughcolor="#343941",
            bordercolor="#24272b",
            lightcolor="#24272b",
            darkcolor="#24272b",
        )
        style.configure(
            "Sidebar.Vertical.TScrollbar",
            background="#2b3036",
            troughcolor="#1a1c1f",
            arrowcolor="#9aa4af",
            bordercolor="#1a1c1f",
            darkcolor="#1a1c1f",
            lightcolor="#1a1c1f",
            relief="flat",
            gripcount=0,
            width=10,
        )
        style.map(
            "Sidebar.Vertical.TScrollbar",
            background=[("active", "#3a4149"), ("pressed", "#4b5561")],
            arrowcolor=[("active", "#d1d5db")],
        )
        style.configure("Studio.TNotebook", background="#1a1c1f", borderwidth=0, tabmargins=(0, 0, 0, 0))
        style.configure(
            "Studio.TNotebook.Tab",
            background="#24272b",
            foreground="#9ca3af",
            padding=(14, 8),
            borderwidth=0,
            font=("Segoe UI Semibold", 10),
        )
        style.map(
            "Studio.TNotebook.Tab",
            background=[("selected", "#111315"), ("active", "#2b3036")],
            foreground=[("selected", "#f5f7fa"), ("active", "#e5e7eb")],
        )

    def _build_layout(self) -> None:
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(2, weight=1)

        shell = ttk.Frame(self.root, style="Panel.TFrame", padding=(18, 14, 18, 18))
        shell.grid(row=0, column=0, sticky="nsew")
        shell.columnconfigure(0, weight=1)
        shell.rowconfigure(2, weight=1)

        header = ttk.Frame(shell, style="Panel.TFrame")
        header.grid(row=0, column=0, sticky="ew", pady=(0, 12))
        header.columnconfigure(0, weight=1)
        ttk.Label(header, text="Game of Life Studio", style="Header.TLabel").grid(row=0, column=0, sticky="w")
        ttk.Label(
            header,
            text="Fusion-inspired cellular automata workflow for composing, previewing, and exporting motion studies.",
            style="Subtle.TLabel",
        ).grid(row=1, column=0, sticky="w", pady=(4, 0))

        self.workflow_tabs = ttk.Notebook(shell, style="Studio.TNotebook")
        self.workflow_tabs.grid(row=1, column=0, sticky="ew", pady=(0, 12))

        self.scene_workflow_tab = ttk.Frame(self.workflow_tabs, style="Panel.TFrame", padding=(0, 10, 0, 0))
        self.preview_workflow_tab = ttk.Frame(self.workflow_tabs, style="Panel.TFrame", padding=(0, 10, 0, 0))
        self.export_workflow_tab = ttk.Frame(self.workflow_tabs, style="Panel.TFrame", padding=(0, 10, 0, 0))
        for tab in (self.scene_workflow_tab, self.preview_workflow_tab, self.export_workflow_tab):
            tab.columnconfigure(0, weight=1)

        self.workflow_tabs.add(self.scene_workflow_tab, text="◨ Scene Setup")
        self.workflow_tabs.add(self.preview_workflow_tab, text="▶ Preview / View")
        self.workflow_tabs.add(self.export_workflow_tab, text="⭳ Export")

        self._build_scene_workflow_tab()
        self._build_preview_workflow_tab()
        self._build_export_workflow_tab()

        canvas_wrap = ttk.Frame(shell, style="Card.TFrame", padding=12)
        canvas_wrap.grid(row=2, column=0, sticky="nsew")
        canvas_wrap.columnconfigure(0, weight=1)
        canvas_wrap.rowconfigure(1, weight=1)

        canvas_header = ttk.Frame(canvas_wrap, style="Card.TFrame")
        canvas_header.grid(row=0, column=0, sticky="ew", pady=(0, 10))
        canvas_header.columnconfigure(0, weight=1)
        ttk.Label(canvas_header, text="Simulation View", style="Section.TLabel").grid(row=0, column=0, sticky="w")
        ttk.Label(
            canvas_header,
            text="Compose on the canvas with the tool rail below, then capture a preview from the top workflow tabs.",
            style="CardSubtle.TLabel",
        ).grid(row=1, column=0, sticky="w", pady=(4, 0))

        self.canvas = tk.Canvas(
            canvas_wrap,
            bg=self.background_var.get(),
            bd=0,
            highlightthickness=1,
            highlightbackground="#343941",
            relief="flat",
            cursor="crosshair",
        )
        self.canvas.grid(row=1, column=0, sticky="nsew")
        self.canvas.bind("<Button-1>", self.on_canvas_press)
        self.canvas.bind("<B1-Motion>", self.on_canvas_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_canvas_release)
        self.canvas.bind("<Configure>", lambda _event: self.redraw())

        self.tool_rail = ttk.Frame(canvas_wrap, style="Panel.TFrame")
        self.tool_rail.grid(row=2, column=0, sticky="ew", pady=(12, 0))
        self.tool_rail.columnconfigure(0, weight=1)
        self._build_canvas_tool_rail()

    def _sync_sidebar_scroll(self, _event=None) -> None:
        self.sidebar_canvas.configure(scrollregion=self.sidebar_canvas.bbox("all"))
        self._update_sidebar_scrollbar()

    def _resize_sidebar_content(self, event) -> None:
        self.sidebar_canvas.itemconfigure(self.sidebar_window, width=event.width)
        self._update_sidebar_scrollbar()

    def _on_sidebar_scroll(self, first, last) -> None:
        self.sidebar_scroll.set(first, last)
        self._update_sidebar_scrollbar(float(first), float(last))

    def _update_sidebar_scrollbar(self, first=None, last=None) -> None:
        if first is None or last is None:
            first, last = self.sidebar_canvas.yview()
        else:
            first = float(first)
            last = float(last)
        if last - first >= 0.999:
            self.sidebar_scroll.grid_remove()
        else:
            self.sidebar_scroll.grid()

    def _set_sidebar_hover(self, hovered: bool) -> None:
        self.sidebar_hovered = hovered

    def _on_mousewheel(self, event) -> None:
        if self.sidebar_canvas.winfo_exists() and self.sidebar_hovered and self.sidebar_scroll.winfo_ismapped():
            self.sidebar_canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

    def _apply_window_theme(self) -> None:
        if sys.platform != "win32":
            return
        try:
            self.root.update_idletasks()
            hwnd = ctypes.windll.user32.GetParent(self.root.winfo_id())
            if not hwnd:
                hwnd = self.root.winfo_id()
            value = ctypes.c_int(1)
            for attribute in (20, 19):
                ctypes.windll.dwmapi.DwmSetWindowAttribute(
                    hwnd,
                    attribute,
                    ctypes.byref(value),
                    ctypes.sizeof(value),
                )
            ctypes.windll.uxtheme.SetWindowTheme(hwnd, "DarkMode_Explorer", None)
        except Exception:
            pass

    def _create_section(self, parent, row: int, section_id: str, title: str, subtitle: str, expanded: bool = True):
        shell = ttk.Frame(parent, style="Card.TFrame", padding=14)
        shell.grid(row=row, column=0, sticky="ew", pady=(0, 12))
        shell.columnconfigure(0, weight=1)

        header = ttk.Frame(shell, style="Card.TFrame")
        header.grid(row=0, column=0, sticky="ew")
        header.columnconfigure(0, weight=1)

        self.section_open[section_id] = expanded
        button = ttk.Button(
            header,
            text="",
            style="SectionToggle.TButton",
            command=lambda sid=section_id: self._toggle_section(sid),
        )
        button.grid(row=0, column=0, sticky="w")
        subtitle_style = "CardSubtle.TLabel"
        ttk.Label(header, text=subtitle, style=subtitle_style, wraplength=300).grid(row=1, column=0, sticky="w", pady=(2, 0))

        body = ttk.Frame(shell, style="CardBody.TFrame")
        body.grid(row=1, column=0, sticky="ew", pady=(12, 0))
        body.columnconfigure(0, weight=1)

        self.section_shells[section_id] = shell
        self.section_bodies[section_id] = (body, button, title)
        self._refresh_section_header(section_id)
        if not expanded:
            body.grid_remove()
        return body

    def _refresh_section_header(self, section_id: str) -> None:
        body, button, title = self.section_bodies[section_id]
        marker = "−" if self.section_open.get(section_id, True) else "+"
        marker = "-" if self.section_open.get(section_id, True) else "+"
        button.configure(text=f"{marker}  {title}")

    def _refresh_section_header(self, section_id: str) -> None:
        body, button, title = self.section_bodies[section_id]
        marker = "-" if self.section_open.get(section_id, True) else "+"
        button.configure(text=f"{marker}  {title}")

    def _toggle_section(self, section_id: str) -> None:
        body, _button, _title = self.section_bodies[section_id]
        is_open = self.section_open.get(section_id, True)
        if is_open:
            body.grid_remove()
        else:
            body.grid()
        self.section_open[section_id] = not is_open
        self._refresh_section_header(section_id)
        self._sync_sidebar_scroll()

    def _build_workflow_intro(self, parent, row: int, title: str, body: str) -> None:
        intro = ttk.Frame(parent, style="Card.TFrame", padding=14)
        intro.grid(row=row, column=0, sticky="ew", pady=(0, 12))
        intro.columnconfigure(0, weight=1)
        ttk.Label(intro, text=title, style="Section.TLabel").grid(row=0, column=0, sticky="w")
        ttk.Label(intro, text=body, style="CardSubtle.TLabel", wraplength=300, justify="left").grid(
            row=1, column=0, sticky="w", pady=(6, 0)
        )

    def _workflow_nav_row(self, parent, row: int, back_target: int | None, next_target: int | None, next_label: str) -> None:
        nav = ttk.Frame(parent, style="Panel.TFrame")
        nav.grid(row=row, column=0, sticky="ew", pady=(0, 12))
        nav.columnconfigure((0, 1), weight=1)
        back_button = ttk.Button(
            nav,
            text="Back",
            style="Secondary.TButton",
            command=lambda idx=back_target: self._select_workflow_tab(idx),
        )
        back_button.grid(row=0, column=0, sticky="ew", padx=(0, 6))
        if back_target is None:
            back_button.state(["disabled"])
        next_button = ttk.Button(
            nav,
            text=next_label,
            style="Primary.TButton",
            command=lambda idx=next_target: self._select_workflow_tab(idx),
        )
        next_button.grid(row=0, column=1, sticky="ew", padx=(6, 0))
        if next_target is None:
            next_button.state(["disabled"])

    def _select_workflow_tab(self, index: int | None) -> None:
        if index is None:
            return
        self.workflow_tabs.select(index)
        self._sync_sidebar_scroll()

    def _build_canvas_tool_rail(self) -> None:
        icons = {
            "Brush": "✎",
            "Block": "◻",
            "Glider": "➚",
            "Cross": "✚",
            "Diamond": "◆",
            "Exploder": "✳",
        }
        rail = ttk.Frame(self.tool_rail, style="Card.TFrame", padding=(14, 12))
        rail.grid(row=0, column=0, sticky="ew")
        rail.columnconfigure(1, weight=1)
        ttk.Label(rail, text="Canvas Tools", style="CardSubtle.TLabel").grid(row=0, column=0, sticky="w", padx=(0, 14))
        button_row = ttk.Frame(rail, style="Card.TFrame")
        button_row.grid(row=0, column=1, sticky="w")
        for index, tool_name in enumerate(STAMP_PATTERNS.keys()):
            button = tk.Radiobutton(
                button_row,
                text=f"{icons.get(tool_name, '•')}\n{tool_name}",
                value=tool_name,
                variable=self.paint_tool_var,
                indicatoron=False,
                selectcolor="#3b82f6",
                bg="#202327",
                fg="#e5e7eb",
                activebackground="#313741",
                activeforeground="#ffffff",
                relief="flat",
                padx=12,
                pady=8,
                highlightthickness=0,
                bd=0,
                font=("Segoe UI Semibold", 9),
                justify="center",
                width=7,
            )
            button.grid(row=0, column=index, padx=(0, 8))
            self._add_tooltip(button, f"Use the {tool_name} tool when painting directly on the canvas.")

    def _build_scene_workflow_tab(self) -> None:
        self.scene_setup_tabs = ttk.Notebook(self.scene_workflow_tab, style="Studio.TNotebook")
        self.scene_setup_tabs.grid(row=0, column=0, sticky="ew")
        scene_tab = ttk.Frame(self.scene_setup_tabs, style="Panel.TFrame", padding=(0, 8, 0, 0))
        rules_tab = ttk.Frame(self.scene_setup_tabs, style="Panel.TFrame", padding=(0, 8, 0, 0))
        colors_tab = ttk.Frame(self.scene_setup_tabs, style="Panel.TFrame", padding=(0, 8, 0, 0))
        tools_tab = ttk.Frame(self.scene_setup_tabs, style="Panel.TFrame", padding=(0, 8, 0, 0))
        for tab in (scene_tab, rules_tab, colors_tab, tools_tab):
            tab.columnconfigure(0, weight=1)
        self.scene_setup_tabs.add(scene_tab, text="⚙ Scene")
        self.scene_setup_tabs.add(rules_tab, text="⌘ Rules")
        self.scene_setup_tabs.add(colors_tab, text="◈ Colors")
        self.scene_setup_tabs.add(tools_tab, text="✎ Seed Tools")
        self._build_grid_card(scene_tab, 0)
        self._build_rules_card(rules_tab, 0)
        self._build_look_card(colors_tab, 0)
        self._build_text_card(tools_tab, 0)

    def _build_preview_workflow_tab(self) -> None:
        preview_grid = ttk.Frame(self.preview_workflow_tab, style="Panel.TFrame")
        preview_grid.grid(row=0, column=0, sticky="ew")
        preview_grid.columnconfigure(0, weight=3)
        preview_grid.columnconfigure(1, weight=2)
        left = ttk.Frame(preview_grid, style="Panel.TFrame")
        right = ttk.Frame(preview_grid, style="Panel.TFrame")
        left.grid(row=0, column=0, sticky="nsew", padx=(0, 8))
        right.grid(row=0, column=1, sticky="nsew", padx=(8, 0))
        left.columnconfigure(0, weight=1)
        right.columnconfigure(0, weight=1)
        self._build_transport_card(left, 0)
        self._build_status_card(right, 0)

    def _build_export_workflow_tab(self) -> None:
        self._build_export_card(self.export_workflow_tab, 0)

    def _build_transport_card(self, parent, row: int) -> None:
        card = self._create_section(parent, row, "preview", "Preview Timeline", "Capture a run, then scrub, play, reverse, and stop through its frames.", expanded=True)
        card.columnconfigure((0, 1, 2, 3), weight=1)

        record_button = ttk.Button(card, text="▶ Capture Preview", style="Primary.TButton", command=self.start_preview_recording)
        record_button.grid(row=0, column=0, columnspan=2, sticky="ew", pady=(0, 8), padx=(0, 6))
        self._add_tooltip(record_button, "Capture a preview run from the current scene using the frame count and step settings below.")
        clear_preview_button = ttk.Button(card, text="✕ Clear Preview", style="Secondary.TButton", command=self.clear_preview_capture)
        clear_preview_button.grid(row=0, column=2, columnspan=2, sticky="ew", pady=(0, 8), padx=(6, 0))
        self._add_tooltip(clear_preview_button, "Discard the captured preview so you can record a fresh one.")

        self._spinbox(card, "Preview Frames", self.gif_frames_var, 12, 360, 1, 1, 0, "How many frames to capture into the preview and final GIF.")
        self._spinbox(card, "Step Size", self.gif_step_var, 1, 12, 1, 1, 2, "How many generations to advance between captured preview frames.")
        self._spinbox(card, "Playback FPS", self.gif_fps_var, 4, 30, 1, 3, 0, "How fast the preview playback runs and how fast the exported GIF plays.")
        self._spinbox(card, "Export Scale", self.gif_scale_var, 1, 6, 1, 3, 2, "Image scale multiplier used when exporting the captured preview.")

        controls = ttk.Frame(card, style="CardBody.TFrame")
        controls.grid(row=5, column=0, columnspan=4, sticky="ew", pady=(12, 0))
        controls.columnconfigure((0, 1, 2, 3, 4, 5, 6), weight=1)
        ttk.Button(controls, text="|◀", style="Secondary.TButton", command=self.preview_first_frame).grid(row=0, column=0, sticky="ew", padx=(0, 4))
        ttk.Button(controls, text="◀", style="Secondary.TButton", command=self.preview_step_backward).grid(row=0, column=1, sticky="ew", padx=4)
        ttk.Button(controls, text="▶", style="Primary.TButton", command=self.play_preview_forward).grid(row=0, column=2, sticky="ew", padx=4)
        ttk.Button(controls, text="◀▶", style="Secondary.TButton", command=self.play_preview_reverse).grid(row=0, column=3, sticky="ew", padx=4)
        ttk.Button(controls, text="■", style="Secondary.TButton", command=self.stop_playback).grid(row=0, column=4, sticky="ew", padx=4)
        ttk.Button(controls, text="▶|", style="Secondary.TButton", command=self.preview_step_forward).grid(row=0, column=5, sticky="ew", padx=4)
        ttk.Button(controls, text="▶▶", style="Secondary.TButton", command=self.preview_last_frame).grid(row=0, column=6, sticky="ew", padx=(4, 0))

        ttk.Label(card, text="Frame", style="CardSubtle.TLabel").grid(row=6, column=0, sticky="w", pady=(10, 4))
        self.preview_frame_scale = tk.Scale(
            card,
            from_=0,
            to=0,
            orient="horizontal",
            variable=self.preview_frame_index_var,
            command=self._on_preview_scrub,
            bg="#24272b",
            fg="#e5e7eb",
            troughcolor="#343941",
            activebackground="#3b82f6",
            highlightthickness=0,
            bd=0,
            relief="flat",
        )
        self.preview_frame_scale.grid(row=7, column=0, columnspan=4, sticky="ew")
        self._add_tooltip(self.preview_frame_scale, "Move through the captured preview frames manually.")

        preview_status = ttk.Label(card, textvariable=self.preview_status_var, style="CardSubtle.TLabel", wraplength=300, justify="left")
        preview_status.grid(row=8, column=0, columnspan=4, sticky="w", pady=(10, 0))

    def _build_grid_card(self, parent, row: int) -> None:
        card = self._create_section(parent, row, "scene", "Scene Setup", "Build the automata scene, rule set, palette, and canvas behavior.", expanded=True)
        card.columnconfigure((1, 3), weight=1)

        ttk.Label(card, text="Growth Scene", style="CardSubtle.TLabel").grid(row=0, column=0, sticky="w", pady=(0, 4))
        scene_box = ttk.Combobox(card, values=list(GROWTH_SCENES.keys()), textvariable=self.scene_var, state="readonly")
        scene_box.grid(row=0, column=1, columnspan=3, sticky="ew", pady=(0, 4))
        scene_box.bind("<<ComboboxSelected>>", lambda _event: self.apply_growth_scene(self.scene_var.get()))
        self._add_tooltip(scene_box, "Choose a growth recipe tuned for a certain visual mood or colony style.")

        self.scene_summary_label = ttk.Label(card, text="", style="CardSubtle.TLabel", wraplength=300, justify="left")
        self.scene_summary_label.grid(row=1, column=0, columnspan=4, sticky="w", pady=(2, 10))

        ttk.Button(card, text="✓ Apply Scene Tweaks", style="Secondary.TButton", command=self.apply_scene_tweaks).grid(
            row=2, column=0, columnspan=2, sticky="ew", padx=(0, 6), pady=(0, 10)
        )
        ttk.Button(card, text="⟲ Restore Scene", style="Secondary.TButton", command=self.restore_scene_defaults).grid(
            row=2, column=2, columnspan=2, sticky="ew", padx=(6, 0), pady=(0, 10)
        )
        ttk.Button(card, text="⌫ Reset Scene", style="Secondary.TButton", command=lambda: self.create_grid(randomize=False)).grid(
            row=3, column=0, columnspan=2, sticky="ew", padx=(0, 6), pady=(0, 10)
        )
        ttk.Button(card, text="✦ Randomize Scene", style="Secondary.TButton", command=self.reseed).grid(
            row=3, column=2, columnspan=2, sticky="ew", padx=(6, 0), pady=(0, 10)
        )

        self._spinbox(card, "Rows", self.rows_var, 20, 240, 1, 4, 0, "Number of grid rows in the simulation.")
        self._spinbox(card, "Columns", self.cols_var, 20, 320, 1, 4, 2, "Number of grid columns in the simulation.")
        self._spinbox(card, "Cell Size", self.cell_size_var, 4, 18, 1, 6, 0, "Render size for each cell on the canvas.")

        wrap_button = ttk.Checkbutton(card, text="Wrap Edges", variable=self.wrap_var, style="Toggle.TCheckbutton")
        wrap_button.grid(row=8, column=0, columnspan=2, sticky="w", pady=(10, 0))
        self._add_tooltip(wrap_button, "Connect the left/right and top/bottom edges so patterns wrap around.")
        show_grid_button = ttk.Checkbutton(card, text="Show Grid", variable=self.show_grid_var, style="Toggle.TCheckbutton", command=self.redraw)
        show_grid_button.grid(row=8, column=2, columnspan=2, sticky="w", pady=(10, 0))
        self._add_tooltip(show_grid_button, "Overlay subtle grid lines on the simulation view.")
        self._add_scale(card, "Density", self.random_density_var, 0.02, 0.6, row=9, formatter=lambda v: f"{float(v):.2f}")
        self._add_scale(card, "Speed", self.speed_var, 1, 20, row=11, formatter=lambda v: f"{int(float(v))}x")
        self._add_scale(card, "Trail", self.fade_var, 0.0, 1.0, row=13, formatter=lambda v: f"{float(v):.2f}")
        self._add_scale(card, "Grid Contrast", self.grid_alpha_var, 0.0, 1.0, row=15, formatter=lambda v: f"{float(v):.2f}")

    def _build_text_card(self, parent, row: int) -> None:
        card = self._create_section(parent, row, "seeds", "Seed & Paint", "Lay down text, add extra noise, and stamp patterns into the scene.", expanded=True)
        card.columnconfigure((1, 3), weight=1)

        entry = tk.Entry(
            card,
            textvariable=self.text_seed_var,
            bg="#1f2328",
            fg="#e5e7eb",
            relief="flat",
            highlightthickness=1,
            highlightbackground="#3a3f46",
            highlightcolor="#60a5fa",
            insertbackground="#e5e7eb",
        )
        entry.grid(row=0, column=0, columnspan=4, sticky="ew")
        self._add_tooltip(entry, "Text to stamp onto the board as the starting live-cell pattern.")

        ttk.Button(card, text="Aa Stamp Text", style="Secondary.TButton", command=self.seed_text).grid(
            row=1, column=0, columnspan=2, sticky="ew", pady=(10, 4), padx=(0, 6)
        )
        ttk.Button(card, text="✦ Blend Noise", style="Secondary.TButton", command=self.add_noise_overlay).grid(
            row=1, column=2, columnspan=2, sticky="ew", pady=(10, 4), padx=(6, 0)
        )

        self._add_scale(card, "Text Size", self.text_scale_var, 1, 6, row=2, formatter=lambda v: f"{int(float(v))}x")
        self._spinbox(card, "X Offset", self.text_offset_x_var, -120, 120, 1, 4, 0, "Horizontal offset for the text seed.")
        self._spinbox(card, "Y Offset", self.text_offset_y_var, -120, 120, 1, 6, 0, "Vertical offset for the text seed.")
        ttk.Label(
            card,
            text="Use the bottom canvas tool rail to switch between brush and stamp tools while composing the scene.",
            style="CardSubtle.TLabel",
            wraplength=300,
            justify="left",
        ).grid(row=8, column=0, columnspan=4, sticky="w", pady=(10, 0))

    def _build_export_card(self, parent, row: int) -> None:
        card = self._create_section(parent, row, "export", "Export", "Save the last recorded preview as a GIF with text continuity options.", expanded=True)
        card.columnconfigure((1, 3), weight=1)

        filename_entry = tk.Entry(
            card,
            textvariable=self.gif_filename_var,
            bg="#1f2328",
            fg="#e5e7eb",
            relief="flat",
            highlightthickness=1,
            highlightbackground="#3a3f46",
            highlightcolor="#60a5fa",
            insertbackground="#e5e7eb",
        )
        filename_entry.grid(row=0, column=0, columnspan=3, sticky="ew")
        self._add_tooltip(filename_entry, "Output GIF filename. Use Browse to choose a save location.")
        browse_button = ttk.Button(card, text="Browse", style="Secondary.TButton", command=self.choose_gif_filename)
        browse_button.grid(row=0, column=3, sticky="ew", padx=(8, 0))
        self._add_tooltip(browse_button, "Choose where the exported GIF should be saved.")

        overlay_button = ttk.Checkbutton(card, text="Seed Text Overlay", variable=self.gif_overlay_text_var, style="Toggle.TCheckbutton")
        overlay_button.grid(row=1, column=0, columnspan=4, sticky="w", pady=(12, 0))
        self._add_tooltip(
            overlay_button,
            "GIF-only continuity layer. If a seed text exists, this overlays that same text into the export frames so the message can stay legible as the automaton grows and breaks apart.",
        )
        self._add_scale(card, "Overlay Opacity", self.gif_overlay_opacity_var, 0.0, 1.0, row=2, formatter=lambda v: f"{int(float(v) * 100)}%")

        ttk.Label(card, text="Overlay Color", style="CardSubtle.TLabel").grid(row=4, column=0, sticky="w", pady=(12, 4))
        overlay_mode_box = ttk.Combobox(
            card,
            values=("Same as Seed", "Custom"),
            textvariable=self.gif_overlay_color_mode_var,
            state="readonly",
        )
        overlay_mode_box.grid(row=4, column=1, columnspan=3, sticky="ew", pady=(12, 4))
        overlay_mode_box.bind("<<ComboboxSelected>>", lambda _event: self._update_overlay_color_controls())
        self._add_tooltip(
            overlay_mode_box,
            "Choose whether the GIF-only seed text overlay should inherit the seeded text color or use a custom tint. This only applies when Seed Text Overlay is enabled and a seed text exists.",
        )

        self.overlay_color_row = ttk.Frame(card, style="CardBody.TFrame")
        self.overlay_color_row.grid(row=5, column=0, columnspan=4, sticky="ew", pady=(4, 0))
        self.overlay_color_row.columnconfigure(1, weight=1)
        overlay_color_label = ttk.Label(self.overlay_color_row, text="Custom Tint", style="CardSubtle.TLabel")
        overlay_color_label.grid(row=0, column=0, sticky="w", padx=(0, 12))
        overlay_swatch = tk.Label(self.overlay_color_row, bg=self.gif_overlay_color_var.get(), width=2, relief="flat", bd=0)
        overlay_swatch.grid(row=0, column=1, sticky="w", padx=(0, 8))
        overlay_entry = tk.Entry(
            self.overlay_color_row,
            textvariable=self.gif_overlay_color_var,
            bg="#1f2328",
            fg="#e5e7eb",
            relief="flat",
            highlightthickness=1,
            highlightbackground="#3a3f46",
            highlightcolor="#60a5fa",
            insertbackground="#e5e7eb",
        )
        overlay_entry.grid(row=0, column=2, sticky="ew")
        overlay_pick_button = ttk.Button(
            self.overlay_color_row,
            text="Pick",
            style="Secondary.TButton",
            command=lambda: self.choose_color(self.gif_overlay_color_var, overlay_swatch),
        )
        overlay_pick_button.grid(row=0, column=3, padx=(8, 0))
        self.gif_overlay_color_var.trace_add(
            "write",
            lambda *_args, var=self.gif_overlay_color_var, chip=overlay_swatch: self._update_swatch(var, chip),
        )
        overlay_tip = (
            "Custom tint for the GIF-only seed text overlay. Use this when you want the continuity text to differ "
            "from the live-cell color in the exported GIF."
        )
        self._add_tooltip(overlay_color_label, overlay_tip)
        self._add_tooltip(overlay_swatch, overlay_tip)
        self._add_tooltip(overlay_entry, overlay_tip)
        self._add_tooltip(overlay_pick_button, overlay_tip)
        self._update_overlay_color_controls()

        export_button = ttk.Button(card, text="⭳ Export Last Preview", style="Primary.TButton", command=self.export_gif)
        export_button.grid(row=6, column=0, columnspan=4, sticky="ew", pady=(12, 0))
        self._add_tooltip(export_button, "Save the last recorded preview run. If no preview exists yet, record one from the Preview Run section first.")

    def _build_look_card(self, parent, row: int) -> None:
        card = self._create_section(parent, row, "look", "Appearance", "Palette presets and manual color styling.", expanded=True)
        card.columnconfigure((0, 1), weight=1)

        preset_box = ttk.Combobox(card, values=list(PRESETS.keys()), textvariable=self.preset_var, state="readonly")
        preset_box.grid(row=0, column=0, columnspan=2, sticky="ew", pady=(0, 10))
        preset_box.bind("<<ComboboxSelected>>", lambda _event: self.apply_preset(self.preset_var.get()))
        self._add_tooltip(preset_box, "Apply a preset color palette and matching defaults for the current scene.")

        self._color_picker(card, "Background", self.background_var, 1)
        self._color_picker(card, "Cell", self.cell_var, 2)
        self._color_picker(card, "Grid", self.grid_var, 3)
        self._color_picker(card, "Trail", self.trail_var, 4)

    def _build_rules_card(self, parent, row: int) -> None:
        card = self._create_section(parent, row, "rules", "Rules", "Switch automata families or edit Life-like B/S rules.", expanded=True)
        card.columnconfigure(1, weight=1)

        ttk.Label(card, text="Automaton", style="CardSubtle.TLabel").grid(row=0, column=0, sticky="w", pady=(0, 4))
        rule_box = ttk.Combobox(card, values=list(RULES.keys()), textvariable=self.rule_var, state="readonly")
        rule_box.grid(row=0, column=1, sticky="ew", pady=(0, 4))
        rule_box.bind("<<ComboboxSelected>>", lambda _event: self.apply_rule_preset(self.rule_var.get(), reseed=True))
        self._add_tooltip(rule_box, "Choose a Life-like cellular automaton rule family.")

        ttk.Label(card, text="Birth", style="CardSubtle.TLabel").grid(row=1, column=0, sticky="w", pady=(8, 4))
        birth_entry = tk.Entry(
            card,
            textvariable=self.birth_var,
            bg="#1f2328",
            fg="#e5e7eb",
            relief="flat",
            highlightthickness=1,
            highlightbackground="#3a3f46",
            highlightcolor="#60a5fa",
            insertbackground="#e5e7eb",
        )
        birth_entry.grid(row=1, column=1, sticky="ew", pady=(8, 4))
        self._add_tooltip(birth_entry, "Neighbor counts that cause a dead cell to be born.")

        ttk.Label(card, text="Survive", style="CardSubtle.TLabel").grid(row=2, column=0, sticky="w", pady=(4, 4))
        survive_entry = tk.Entry(
            card,
            textvariable=self.survive_var,
            bg="#1f2328",
            fg="#e5e7eb",
            relief="flat",
            highlightthickness=1,
            highlightbackground="#3a3f46",
            highlightcolor="#60a5fa",
            insertbackground="#e5e7eb",
        )
        survive_entry.grid(row=2, column=1, sticky="ew", pady=(4, 4))
        self._add_tooltip(survive_entry, "Neighbor counts that allow a live cell to survive.")

        ttk.Button(card, text="Apply Rule", style="Secondary.TButton", command=self.apply_custom_rule).grid(
            row=3, column=0, columnspan=2, sticky="ew", pady=(8, 10)
        )

        self.rule_summary_label = ttk.Label(card, text="", style="CardSubtle.TLabel", wraplength=300, justify="left")
        self.rule_summary_label.grid(row=4, column=0, columnspan=2, sticky="w", pady=(0, 10))

        patterns = ttk.Frame(card, style="CardBody.TFrame")
        patterns.grid(row=5, column=0, columnspan=2, sticky="ew")
        patterns.columnconfigure((0, 1, 2), weight=1)
        ttk.Button(patterns, text="Glider Field", style="Secondary.TButton", command=self.seed_gliders).grid(
            row=0, column=0, sticky="ew", padx=(0, 6)
        )
        ttk.Button(patterns, text="Exploder", style="Secondary.TButton", command=self.seed_exploder).grid(
            row=0, column=1, sticky="ew", padx=6
        )
        ttk.Button(patterns, text="Symmetry", style="Secondary.TButton", command=self.seed_symmetric).grid(
            row=0, column=2, sticky="ew", padx=(6, 0)
        )

    def _build_status_card(self, parent, row: int) -> None:
        card = self._create_section(parent, row, "status", "Current Status", "Current run metrics and preview readiness.", expanded=True)
        card.columnconfigure(0, weight=1)
        self.stats_label = ttk.Label(card, text="", style="Value.TLabel", justify="left")
        self.stats_label.grid(row=0, column=0, sticky="w")

    def _spinbox(self, parent, label, variable, start, end, increment, row, column, tooltip_text: str | None = None) -> None:
        label_widget = ttk.Label(parent, text=label, style="CardSubtle.TLabel")
        label_widget.grid(row=row, column=column, sticky="w", pady=(12, 4))
        spin = tk.Spinbox(
            parent,
            from_=start,
            to=end,
            increment=increment,
            textvariable=variable,
            bg="#1f2328",
            fg="#e5e7eb",
            buttonbackground="#2e3238",
            insertbackground="#e5e7eb",
            relief="flat",
            highlightthickness=1,
            highlightbackground="#3a3f46",
            highlightcolor="#60a5fa",
        )
        spin.grid(row=row + 1, column=column, columnspan=2, sticky="ew", padx=(0, 10 if column == 0 else 0))
        if tooltip_text:
            self._add_tooltip(label_widget, tooltip_text)
            self._add_tooltip(spin, tooltip_text)

    def _color_picker(self, parent, label, variable, row) -> None:
        ttk.Label(parent, text=label, style="CardSubtle.TLabel").grid(row=row, column=0, sticky="w", pady=(8, 4))
        wrapper = ttk.Frame(parent, style="CardBody.TFrame")
        wrapper.grid(row=row, column=1, sticky="ew", pady=(8, 4))
        wrapper.columnconfigure(1, weight=1)
        swatch = tk.Label(wrapper, bg=variable.get(), width=2, relief="flat", bd=0)
        swatch.grid(row=0, column=0, padx=(0, 8))
        entry = tk.Entry(
            wrapper,
            textvariable=variable,
            bg="#1f2328",
            fg="#e5e7eb",
            relief="flat",
            highlightthickness=1,
            highlightbackground="#3a3f46",
            highlightcolor="#60a5fa",
            insertbackground="#e5e7eb",
        )
        entry.grid(row=0, column=1, sticky="ew")
        button = ttk.Button(wrapper, text="Pick", style="Secondary.TButton", command=lambda: self.choose_color(variable, swatch))
        button.grid(row=0, column=2, padx=(8, 0))
        variable.trace_add("write", lambda *_args, var=variable, chip=swatch: self._update_swatch(var, chip))

    def _add_scale(self, parent, label, variable, start, end, row, formatter) -> None:
        ttk.Label(parent, text=label, style="CardSubtle.TLabel").grid(row=row, column=0, sticky="w", pady=(10, 0))
        value_label = ttk.Label(parent, text=formatter(variable.get()), style="Value.TLabel")
        value_label.grid(row=row, column=1, sticky="e", columnspan=2, pady=(10, 0))
        scale = ttk.Scale(parent, from_=start, to=end, variable=variable, style="Studio.Horizontal.TScale")
        scale.grid(row=row + 1, column=0, columnspan=3, sticky="ew", pady=(6, 0))
        variable.trace_add("write", lambda *_args, lbl=value_label, fmt=formatter: self._update_scale_label(lbl, fmt, variable))

    def _add_tooltip(self, widget, text: str) -> None:
        self.tooltips.append(ToolTip(widget, text))

    def _update_overlay_color_controls(self) -> None:
        if getattr(self, "overlay_color_row", None) is None:
            return
        if self.gif_overlay_color_mode_var.get() == "Custom":
            self.overlay_color_row.grid()
        else:
            self.overlay_color_row.grid_remove()

    def _update_scale_label(self, label, formatter, variable) -> None:
        label.configure(text=formatter(variable.get()))
        if variable in (self.fade_var, self.grid_alpha_var):
            self.redraw()

    def _update_swatch(self, variable, swatch) -> None:
        value = variable.get()
        if self._is_hex_color(value):
            swatch.configure(bg=value)
            self.redraw()

    def _is_hex_color(self, value: str) -> bool:
        if len(value) != 7 or not value.startswith("#"):
            return False
        return all(ch in "0123456789abcdefABCDEF" for ch in value[1:])

    def choose_color(self, variable, swatch) -> None:
        color = colorchooser.askcolor(color=variable.get(), parent=self.root)[1]
        if color:
            variable.set(color)
            swatch.configure(bg=color)
            self.redraw()

    def choose_gif_filename(self) -> None:
        filename = filedialog.asksaveasfilename(
            parent=self.root,
            title="Export GIF",
            defaultextension=".gif",
            filetypes=[("GIF files", "*.gif")],
            initialfile=self.gif_filename_var.get(),
        )
        if filename:
            self.gif_filename_var.set(filename)

    def invalidate_preview(self, message: str = "Scene changed. Record a new preview to export this setup.") -> None:
        if self.preview_recording:
            return
        self.preview_frames = []
        self.preview_frame_index_var.set(0)
        if hasattr(self, "preview_frame_scale"):
            self.preview_frame_scale.configure(to=0)
        self.preview_status_var.set(message)

    def apply_preset(self, name: str) -> None:
        preset = PRESETS[name]
        self.background_var.set(preset["background"])
        self.cell_var.set(preset["cell"])
        self.grid_var.set(preset["grid"])
        self.trail_var.set(preset["trail"])
        self.random_density_var.set(preset["density"])
        self.speed_var.set(preset["speed"])
        self.wrap_var.set(preset["wrap"])
        self.canvas.configure(bg=self.background_var.get())
        self.invalidate_preview()
        self.redraw()

    def capture_scene_settings(self) -> dict:
        return {
            "density": round(float(self.random_density_var.get()), 3),
            "speed": int(self.speed_var.get()),
            "fade": round(float(self.fade_var.get()), 3),
            "grid_alpha": round(float(self.grid_alpha_var.get()), 3),
            "cell_size": int(self.cell_size_var.get()),
            "show_grid": bool(self.show_grid_var.get()),
        }

    def apply_scene_tweaks(self) -> None:
        scene_name = self.scene_var.get()
        if scene_name not in GROWTH_SCENES:
            return
        self.scene_overrides[scene_name] = self.capture_scene_settings()
        base_scene = GROWTH_SCENES[scene_name]
        code = RULES[base_scene["rule"]]["code"]
        self.scene_summary_label.configure(
            text=f'{base_scene["description"]}  Tuned {code} with density {self.random_density_var.get():.2f}, speed {self.speed_var.get()}x, and {self.cell_size_var.get()} px cells.'
        )
        self.create_grid(randomize=True)

    def restore_scene_defaults(self) -> None:
        scene_name = self.scene_var.get()
        if scene_name in self.scene_overrides:
            del self.scene_overrides[scene_name]
        self.apply_growth_scene(scene_name)

    def apply_growth_scene(self, name: str) -> None:
        scene = {**GROWTH_SCENES[name], **self.scene_overrides.get(name, {})}
        self.scene_var.set(name)
        self.apply_preset(scene["preset"])
        self.rule_var.set(scene["rule"])
        self.apply_rule_preset(scene["rule"])
        self.random_density_var.set(scene["density"])
        self.speed_var.set(scene["speed"])
        self.fade_var.set(scene["fade"])
        self.grid_alpha_var.set(scene["grid_alpha"])
        self.cell_size_var.set(scene["cell_size"])
        self.show_grid_var.set(scene["show_grid"])
        self.scene_summary_label.configure(text=scene["description"])
        self.create_grid(randomize=True)

    def apply_rule_preset(self, name: str, reseed: bool = False) -> None:
        rule = RULES[name]
        birth_digits = "".join(str(value) for value in sorted(rule["birth"]))
        survive_digits = "".join(str(value) for value in sorted(rule["survive"]))
        self.birth_var.set(birth_digits)
        self.survive_var.set(survive_digits)
        self.random_density_var.set(rule["density"])
        self.rule_summary_label.configure(text=f'{rule["code"]}  {rule["description"]}')
        if reseed:
            self.create_grid(randomize=True)
        else:
            self.invalidate_preview()

    def apply_custom_rule(self) -> None:
        birth = self.parse_rule_digits(self.birth_var.get())
        survive = self.parse_rule_digits(self.survive_var.get())
        self.birth_var.set("".join(str(value) for value in sorted(birth)))
        self.survive_var.set("".join(str(value) for value in sorted(survive)))
        self.rule_var.set("Custom")
        code = f'B{self.birth_var.get() or "0"}/S{self.survive_var.get() or "0"}'
        self.rule_summary_label.configure(text=f"{code}  Custom Life-like rule using your birth and survival counts.")
        self.create_grid(randomize=True)

    def parse_rule_digits(self, value: str) -> set[int]:
        return {int(ch) for ch in value if ch.isdigit() and 0 <= int(ch) <= 8}

    def current_rule(self) -> tuple[set[int], set[int]]:
        return self.parse_rule_digits(self.birth_var.get()), self.parse_rule_digits(self.survive_var.get())

    def next_grid_state(self, grid: list[list[int]]) -> list[list[int]]:
        rows = len(grid)
        cols = len(grid[0])
        new_grid = [[0 for _ in range(cols)] for _ in range(rows)]
        wrap = self.wrap_var.get()
        birth_counts, survive_counts = self.current_rule()

        for r in range(rows):
            for c in range(cols):
                neighbors = 0
                for dr in (-1, 0, 1):
                    for dc in (-1, 0, 1):
                        if dr == 0 and dc == 0:
                            continue
                        rr = r + dr
                        cc = c + dc
                        if wrap:
                            rr %= rows
                            cc %= cols
                            neighbors += grid[rr][cc]
                        elif 0 <= rr < rows and 0 <= cc < cols:
                            neighbors += grid[rr][cc]

                if grid[r][c] == 1 and neighbors in survive_counts:
                    new_grid[r][c] = 1
                elif grid[r][c] == 0 and neighbors in birth_counts:
                    new_grid[r][c] = 1
        return new_grid

    def rebuild_grid(self) -> None:
        rows = max(20, self.rows_var.get())
        cols = max(20, self.cols_var.get())
        self.rows_var.set(rows)
        self.cols_var.set(cols)
        self.create_grid(randomize=True)

    def create_grid(self, randomize: bool) -> None:
        self.stop_playback()
        self.invalidate_preview()
        rows = self.rows_var.get()
        cols = self.cols_var.get()
        density = self.random_density_var.get()
        self.grid = [
            [1 if randomize and random.random() < density else 0 for _ in range(cols)]
            for _ in range(rows)
        ]
        self.previous_grid = [[0 for _ in range(cols)] for _ in range(rows)]
        self.generation = 0
        self.live_cells = sum(sum(row) for row in self.grid)
        self.redraw()
        self.update_stats()

    def reseed(self) -> None:
        self.create_grid(randomize=True)

    def clear_preview_capture(self) -> None:
        self.preview_frames = []
        self.preview_frame_index_var.set(0)
        if hasattr(self, "preview_frame_scale"):
            self.preview_frame_scale.configure(to=0)
        self.preview_status_var.set("Preview cleared. Record a new run when the scene looks ready.")

    def add_noise_overlay(self) -> None:
        if not self.grid:
            self.create_grid(randomize=False)
        self.invalidate_preview()
        density = max(0.01, min(0.35, float(self.random_density_var.get()) * 0.45))
        for r in range(len(self.grid)):
            for c in range(len(self.grid[0])):
                if self.grid[r][c] == 0 and random.random() < density:
                    self.grid[r][c] = 1
        self.previous_grid = [[0 for _ in range(len(self.grid[0]))] for _ in range(len(self.grid))]
        self.live_cells = sum(sum(line) for line in self.grid)
        self.redraw()
        self.update_stats()

    def pattern_for_tool(self) -> list[list[int]]:
        return STAMP_PATTERNS.get(self.paint_tool_var.get(), STAMP_PATTERNS["Brush"])

    def stamp_pattern_at(self, center_row: int, center_col: int) -> None:
        self.invalidate_preview()
        pattern = self.pattern_for_tool()
        top = center_row - (len(pattern) // 2)
        left = center_col - (len(pattern[0]) // 2)
        self.seed_pattern(pattern, top, left)
        self.live_cells = sum(sum(line) for line in self.grid)
        self.redraw()
        self.update_stats()

    def seed_pattern(self, pattern, top, left) -> None:
        for r, row in enumerate(pattern):
            for c, value in enumerate(row):
                rr = top + r
                cc = left + c
                if value and 0 <= rr < len(self.grid) and 0 <= cc < len(self.grid[0]):
                    self.grid[rr][cc] = value

    def seed_gliders(self) -> None:
        self.create_grid(randomize=False)
        glider = [
            [0, 1, 0],
            [0, 0, 1],
            [1, 1, 1],
        ]
        for row in range(3, self.rows_var.get() - 3, 10):
            for col in range(3, self.cols_var.get() - 3, 14):
                self.seed_pattern(glider, row, col)
        self.live_cells = sum(sum(line) for line in self.grid)
        self.redraw()
        self.update_stats()

    def seed_exploder(self) -> None:
        self.create_grid(randomize=False)
        exploder = [
            [1, 0, 1],
            [1, 0, 1],
            [1, 0, 1],
            [1, 0, 1],
            [1, 0, 1],
        ]
        center_r = self.rows_var.get() // 2 - 2
        center_c = self.cols_var.get() // 2 - 1
        offsets = [(-18, -24), (-18, 18), (18, -24), (18, 18), (0, 0)]
        for off_r, off_c in offsets:
            self.seed_pattern(exploder, center_r + off_r, center_c + off_c)
        self.live_cells = sum(sum(line) for line in self.grid)
        self.redraw()
        self.update_stats()

    def seed_symmetric(self) -> None:
        self.create_grid(randomize=False)
        rows = self.rows_var.get()
        cols = self.cols_var.get()
        for r in range(rows):
            for c in range(cols // 2):
                alive = 1 if random.random() < self.random_density_var.get() * 0.55 else 0
                self.grid[r][c] = alive
                self.grid[r][cols - c - 1] = alive
        self.live_cells = sum(sum(line) for line in self.grid)
        self.redraw()
        self.update_stats()

    def build_text_pattern(self, message: str, scale: int) -> list[list[int]]:
        lines = message.upper().splitlines() or [""]
        char_spacing = max(1, scale)
        line_spacing = max(1, scale * 2)
        all_rows: list[list[int]] = []

        for line_index, line in enumerate(lines):
            glyphs = [FONT_5X7.get(ch, FONT_5X7["?"]) for ch in line] or [FONT_5X7[" "]]
            line_width = sum((len(glyph[0]) * scale) for glyph in glyphs)
            line_width += char_spacing * max(0, len(glyphs) - 1)
            line_rows = [[0 for _ in range(line_width)] for _ in range(7 * scale)]

            cursor_x = 0
            for glyph in glyphs:
                for glyph_y, glyph_row in enumerate(glyph):
                    for glyph_x, value in enumerate(glyph_row):
                        if value == "1":
                            for sy in range(scale):
                                for sx in range(scale):
                                    line_rows[glyph_y * scale + sy][cursor_x + glyph_x * scale + sx] = 1
                cursor_x += len(glyph[0]) * scale + char_spacing

            all_rows.extend(line_rows)
            if line_index < len(lines) - 1:
                all_rows.extend([[0 for _ in range(line_width)] for _ in range(line_spacing)])

        max_width = max((len(row) for row in all_rows), default=0)
        return [row + [0] * (max_width - len(row)) for row in all_rows]

    def text_pattern_placement(self, rows: int, cols: int):
        message = self.text_seed_var.get().strip()
        if not message:
            return None
        pattern = self.build_text_pattern(message, self.text_scale_var.get())
        if not pattern:
            return None
        pattern_height = len(pattern)
        pattern_width = len(pattern[0])
        start_row = max(0, (rows - pattern_height) // 2 + self.text_offset_y_var.get())
        start_col = max(0, (cols - pattern_width) // 2 + self.text_offset_x_var.get())
        return pattern, start_row, start_col

    def seed_text(self) -> None:
        if not self.grid:
            self.create_grid(randomize=False)
        self.invalidate_preview()
        rows = len(self.grid)
        cols = len(self.grid[0])
        placement = self.text_pattern_placement(rows, cols)
        if not placement:
            return

        pattern, start_row, start_col = placement

        for r, pattern_row in enumerate(pattern):
            grid_r = start_row + r
            if grid_r >= rows:
                break
            for c, value in enumerate(pattern_row):
                grid_c = start_col + c
                if grid_c >= cols:
                    break
                if value:
                    self.grid[grid_r][grid_c] = 1

        self.live_cells = sum(sum(line) for line in self.grid)
        self.redraw()
        self.update_stats()

    def stop_playback(self) -> None:
        self.running = False
        self.preview_recording = False
        self.preview_play_direction = 0
        if self.job:
            self.root.after_cancel(self.job)
            self.job = None

    def snapshot_state(self) -> dict:
        return {
            "grid": [row[:] for row in self.grid],
            "previous_grid": [row[:] for row in self.previous_grid],
            "generation": self.generation,
            "live_cells": self.live_cells,
        }

    def apply_state_snapshot(self, snapshot: dict) -> None:
        self.grid = [row[:] for row in snapshot["grid"]]
        self.previous_grid = [row[:] for row in snapshot["previous_grid"]]
        self.generation = snapshot["generation"]
        self.live_cells = snapshot["live_cells"]
        self.redraw()
        self.update_stats()

    def start_preview_recording(self) -> None:
        if not self.grid:
            return
        self.stop_playback()
        self.preview_frames = []
        self.preview_duration = max(20, int(1000 / max(1, self.gif_fps_var.get())))
        self.preview_recording = True
        self.preview_status_var.set("Recording preview from the current scene.")
        self.capture_preview_frame()
        if len(self.preview_frames) >= max(1, self.gif_frames_var.get()):
            self.finish_preview_recording()
            return
        self.schedule_next_frame(delay=self.preview_duration)

    def finish_preview_recording(self) -> None:
        self.preview_recording = False
        self.job = None
        if hasattr(self, "preview_frame_scale"):
            self.preview_frame_scale.configure(to=max(0, len(self.preview_frames) - 1))
        self.preview_frame_index_var.set(0)
        if self.preview_frames:
            self.apply_preview_frame(0)
        self.preview_status_var.set(
            f"Preview ready: {len(self.preview_frames)} frames captured at {self.gif_fps_var.get()} FPS."
        )

    def schedule_next_frame(self, delay: int | None = None) -> None:
        if delay is None:
            delay = max(10, int(220 - (self.speed_var.get() * 10)))
        self.job = self.root.after(delay, self.run_frame)

    def run_frame(self) -> None:
        if self.preview_recording:
            self.advance_simulation(max(1, self.gif_step_var.get()))
            self.capture_preview_frame()
            if len(self.preview_frames) >= max(1, self.gif_frames_var.get()):
                self.finish_preview_recording()
            else:
                self.schedule_next_frame(delay=self.preview_duration)
            return
        if self.preview_play_direction:
            next_index = self.preview_frame_index_var.get() + self.preview_play_direction
            if next_index < 0 or next_index >= len(self.preview_frames):
                self.stop_playback()
                return
            self.preview_frame_index_var.set(next_index)
            self.apply_preview_frame(next_index)
            self.schedule_next_frame(delay=self.preview_duration)
            return
        if not self.running:
            return
        self.step_once()
        self.schedule_next_frame()

    def step_once(self) -> None:
        self.advance_simulation()

    def advance_simulation(self, steps: int = 1) -> None:
        for _ in range(max(1, steps)):
            new_grid = self.next_grid_state(self.grid)
            self.previous_grid = [row[:] for row in self.grid]
            self.grid = new_grid
            self.generation += 1
        self.live_cells = sum(sum(row) for row in self.grid)
        self.redraw()
        self.update_stats()

    def capture_preview_frame(self) -> None:
        if not self.grid:
            return
        self.preview_frames.append(self.snapshot_state())

    def apply_preview_frame(self, index: int) -> None:
        if not self.preview_frames:
            return
        index = max(0, min(index, len(self.preview_frames) - 1))
        self.preview_frame_index_var.set(index)
        self.apply_state_snapshot(self.preview_frames[index])
        self.preview_status_var.set(f"Preview frame {index + 1} of {len(self.preview_frames)}.")

    def _on_preview_scrub(self, value) -> None:
        if not self.preview_frames:
            return
        self.stop_playback()
        self.apply_preview_frame(int(float(value)))

    def preview_first_frame(self) -> None:
        self.stop_playback()
        self.apply_preview_frame(0)

    def preview_step_backward(self) -> None:
        self.stop_playback()
        self.apply_preview_frame(self.preview_frame_index_var.get() - 1)

    def preview_step_forward(self) -> None:
        self.stop_playback()
        self.apply_preview_frame(self.preview_frame_index_var.get() + 1)

    def preview_last_frame(self) -> None:
        self.stop_playback()
        self.apply_preview_frame(len(self.preview_frames) - 1)

    def play_preview_forward(self) -> None:
        if not self.preview_frames:
            self.preview_status_var.set("Capture a preview first so there are frames to play.")
            return
        self.stop_playback()
        self.preview_play_direction = 1
        self.schedule_next_frame(delay=self.preview_duration)

    def play_preview_reverse(self) -> None:
        if not self.preview_frames:
            self.preview_status_var.set("Capture a preview first so there are frames to play.")
            return
        self.stop_playback()
        self.preview_play_direction = -1
        self.schedule_next_frame(delay=self.preview_duration)

    def render_grid_image(self, grid: list[list[int]], previous_grid: list[list[int]], scale: int) -> Image.Image:
        rows = len(grid)
        cols = len(grid[0])
        cell_px = max(1, self.cell_size_var.get() * scale)
        width = cols * cell_px
        height = rows * cell_px

        bg = self.background_var.get()
        cell_color = self.cell_var.get()
        trail_color = self.blend_colors(self.trail_var.get(), bg, self.fade_var.get())
        grid_color = self.blend_colors(self.grid_var.get(), bg, self.grid_alpha_var.get())

        image = Image.new("RGB", (width, height), ImageColor.getrgb(bg))
        draw = ImageDraw.Draw(image)

        for r in range(rows):
            y0 = r * cell_px
            y1 = y0 + cell_px - 1
            for c in range(cols):
                x0 = c * cell_px
                x1 = x0 + cell_px - 1
                if grid[r][c]:
                    draw.rectangle((x0, y0, x1, y1), fill=cell_color)
                elif previous_grid and previous_grid[r][c] and self.fade_var.get() > 0:
                    draw.rectangle((x0, y0, x1, y1), fill=trail_color)

        if self.show_grid_var.get() and cell_px >= 5 and self.grid_alpha_var.get() > 0:
            for x in range(0, width + 1, cell_px):
                draw.line((x, 0, x, height), fill=grid_color)
            for y in range(0, height + 1, cell_px):
                draw.line((0, y, width, y), fill=grid_color)

        if self.gif_overlay_text_var.get():
            placement = self.text_pattern_placement(rows, cols)
            if placement:
                pattern, start_row, start_col = placement
                overlay_base_color = (
                    self.gif_overlay_color_var.get()
                    if self.gif_overlay_color_mode_var.get() == "Custom" and self._is_hex_color(self.gif_overlay_color_var.get())
                    else cell_color
                )
                overlay_color = self.blend_colors(overlay_base_color, bg, self.gif_overlay_opacity_var.get())
                for r, pattern_row in enumerate(pattern):
                    grid_r = start_row + r
                    if grid_r >= rows:
                        break
                    y0 = grid_r * cell_px
                    y1 = y0 + cell_px - 1
                    for c, value in enumerate(pattern_row):
                        if not value:
                            continue
                        grid_c = start_col + c
                        if grid_c >= cols:
                            break
                        x0 = grid_c * cell_px
                        x1 = x0 + cell_px - 1
                        draw.rectangle((x0, y0, x1, y1), fill=overlay_color)

        return image

    def export_gif(self) -> None:
        filename = self.gif_filename_var.get().strip() or "life-export.gif"
        if not filename.lower().endswith(".gif"):
            filename += ".gif"
            self.gif_filename_var.set(filename)

        if not self.preview_frames:
            self.preview_status_var.set("No preview recorded yet. Use Record Preview before exporting.")
            return

        images = [
            self.render_grid_image(frame["grid"], frame["previous_grid"], max(1, self.gif_scale_var.get()))
            for frame in self.preview_frames
        ]
        images[0].save(
            filename,
            save_all=True,
            append_images=images[1:],
            duration=self.preview_duration,
            loop=0,
            optimize=False,
        )
        self.preview_status_var.set(f"Exported the recorded preview to {filename}")

    def update_stats(self) -> None:
        rows = len(self.grid) if self.grid else 0
        cols = len(self.grid[0]) if self.grid else 0
        fill = (self.live_cells / (rows * cols)) if rows and cols else 0
        code = f'B{self.birth_var.get()}/S{self.survive_var.get()}'
        self.stats_label.configure(
            text=(
                f"Generation: {self.generation}\n"
                f"Live cells: {self.live_cells}\n"
                f"Fill ratio: {fill:.3f}\n"
                f"Grid: {cols} x {rows}\n"
                f"Resolution: {self.cell_size_var.get()} px\n"
                f"Rule: {code}\n"
                f"Preview frames: {len(self.preview_frames)}"
            )
        )
        self.canvas.configure(bg=self.background_var.get())

    def redraw(self) -> None:
        if not self.grid:
            return

        rows = len(self.grid)
        cols = len(self.grid[0])
        size = self.cell_size_var.get()
        width = cols * size
        height = rows * size

        self.canvas.delete("all")
        self.canvas.configure(scrollregion=(0, 0, width, height), bg=self.background_var.get())

        bg = self.background_var.get()
        cell_color = self.cell_var.get()
        trail_color = self.blend_colors(self.trail_var.get(), bg, self.fade_var.get())
        grid_color = self.blend_colors(self.grid_var.get(), bg, self.grid_alpha_var.get())

        self.canvas.create_rectangle(0, 0, width, height, fill=bg, outline="")

        for r in range(rows):
            y0 = r * size
            y1 = y0 + size
            for c in range(cols):
                x0 = c * size
                x1 = x0 + size
                if self.grid[r][c]:
                    self.canvas.create_rectangle(x0, y0, x1, y1, fill=cell_color, outline="")
                elif self.previous_grid and self.previous_grid[r][c] and self.fade_var.get() > 0:
                    self.canvas.create_rectangle(x0, y0, x1, y1, fill=trail_color, outline="")

        if self.show_grid_var.get() and size >= 5 and self.grid_alpha_var.get() > 0:
            for x in range(0, width + 1, size):
                self.canvas.create_line(x, 0, x, height, fill=grid_color)
            for y in range(0, height + 1, size):
                self.canvas.create_line(0, y, width, y, fill=grid_color)

        canvas_width = self.canvas.winfo_width()
        canvas_height = self.canvas.winfo_height()
        offset_x = max(0, (canvas_width - width) // 2)
        offset_y = max(0, (canvas_height - height) // 2)
        self.canvas.move("all", offset_x, offset_y)

    def blend_colors(self, foreground: str, background: str, alpha: float) -> str:
        fg = self.hex_to_rgb(foreground)
        bg = self.hex_to_rgb(background)
        blended = tuple(int((alpha * f) + ((1 - alpha) * b)) for f, b in zip(fg, bg))
        return self.rgb_to_hex(blended)

    def hex_to_rgb(self, value: str) -> tuple[int, int, int]:
        value = value.lstrip("#")
        return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))

    def rgb_to_hex(self, rgb: tuple[int, int, int]) -> str:
        return "#%02x%02x%02x" % rgb

    def on_canvas_press(self, event) -> None:
        cell = self.canvas_to_cell(event.x, event.y)
        if cell is None:
            return
        row, col = cell
        if self.paint_tool_var.get() != "Brush":
            self.drag_state = 1
            self.stamp_pattern_at(row, col)
            return
        self.invalidate_preview()
        self.drag_state = 0 if self.grid[row][col] else 1
        self.grid[row][col] = self.drag_state
        self.live_cells = sum(sum(line) for line in self.grid)
        self.redraw()
        self.update_stats()

    def on_canvas_drag(self, event) -> None:
        cell = self.canvas_to_cell(event.x, event.y)
        if cell is None or self.drag_state is None:
            return
        row, col = cell
        if self.paint_tool_var.get() != "Brush":
            self.stamp_pattern_at(row, col)
            return
        self.invalidate_preview()
        self.grid[row][col] = self.drag_state
        self.live_cells = sum(sum(line) for line in self.grid)
        self.redraw()
        self.update_stats()

    def on_canvas_release(self, _event) -> None:
        self.drag_state = None

    def canvas_to_cell(self, x: int, y: int):
        if not self.grid:
            return None
        rows = len(self.grid)
        cols = len(self.grid[0])
        size = self.cell_size_var.get()
        width = cols * size
        height = rows * size
        offset_x = max(0, (self.canvas.winfo_width() - width) // 2)
        offset_y = max(0, (self.canvas.winfo_height() - height) // 2)
        grid_x = x - offset_x
        grid_y = y - offset_y
        if grid_x < 0 or grid_y < 0 or grid_x >= width or grid_y >= height:
            return None
        return int(grid_y // size), int(grid_x // size)

    def on_close(self) -> None:
        self.running = False
        if self.job:
            self.root.after_cancel(self.job)
        self.root.destroy()


def main() -> None:
    root = tk.Tk()
    LifeApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
