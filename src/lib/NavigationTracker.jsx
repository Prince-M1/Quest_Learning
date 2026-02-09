import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function NavigationTracker() {
    const location = useLocation();

    // Post navigation changes to parent window
    useEffect(() => {
        window.parent?.postMessage({
            type: "app_changed_url",
            url: window.location.href
        }, '*');
    }, [location]);

    // ✅ Navigation logging removed - no longer using base44
    // If you need analytics, integrate with Google Analytics or similar

    return null;
}