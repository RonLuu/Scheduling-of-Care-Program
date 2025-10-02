import React from "react";
import "../css/global_style.css";
import { Link } from "react-router-dom";
import useAuth from "./dashboard/hooks/useAuth.jsx";
import NavigationTab from "./NavigationTab.jsx";
// dashboard has been changed to profile
// function Header() {
//   const { me } = useAuth();
//   const mockMe = me || { name: "John Doe" };
//   return (
//     <header className="header">
//       {me && (
//         <span className="link">
//             Hello,&nbsp;
//             <Link to="/profile">{me?.name || "Testing2"}</Link>
//         </span>
//       )}
      
//     </header>
//   );
// }
function Header() {
  const { me } = useAuth();

  return (
    <header className="header">
      <div className="navigation-tab"><NavigationTab/></div>

      <span className="link">
          Hello,&nbsp;
          <Link to="/profile">{me?.name || "Testing2"}</Link>
      </span>
    </header>
  );
}

export default Header;
