import {useLocation} from "react-router-dom";

//the proof panel and nav bar are created here since they are needed on every page, 
//so they can be easily imported and reused from here without having to rewrite code
export default function ProofPanel(){
    const location=useLocation();
    const current_time= new Date().toLocaleString();

    return(
        <div style={{
            position: "fixed",
            top: 12,
            right: 12,
            backgroundColor: "rgba(0,0,0,0.85)",
            color: "white",
            padding: "12px 18px",
            borderRadius: "10px",
            fontSize: "15px",
            zIndex: 9999,
            lineHeight: "2",
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)"
        }}>
            <div><strong>Student:</strong> Amr El Masri</div>
            <div><strong>Time:</strong> {current_time}</div>
            <div><strong>Route:</strong> {location.pathname}</div>
        </div>
    );
}