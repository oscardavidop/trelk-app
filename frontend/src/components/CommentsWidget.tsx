
import { useEffect, useRef } from "react";

interface CommentsWidgetProps {
    websiteId?: string;
    limit?: number;
    dislikes?: boolean;
    colorful?: boolean;
    dark?: boolean;
}

export default function CommentsWidget({
    websiteId = "K_w_-kMK",
    limit = 5,
    dislikes = true,
    colorful = true,
    dark = true,
}: CommentsWidgetProps) {
    return null
    //   const containerRef = useRef<HTMLDivElement>(null);
    //   const loadedRef = useRef(false);

    //   useEffect(() => {
    //     if (!containerRef.current) return;
    //     if (loadedRef.current) return; // evita doble render
    //     loadedRef.current = true;

    //     const script = document.createElement("script");
    //     script.src = "https://comments.app/js/widget.js?3";
    //     script.async = true;

    //     script.setAttribute("data-comments-app-website", websiteId);
    //     script.setAttribute("data-limit", String(limit));
    //     script.setAttribute("data-dislikes", dislikes ? "1" : "0");
    //     script.setAttribute("data-colorful", colorful ? "1" : "0");
    //     script.setAttribute("data-dark", dark ? "1" : "0");

    //     containerRef.current.appendChild(script);
    //   }, []);

    //   return <div ref={containerRef} />;
}

