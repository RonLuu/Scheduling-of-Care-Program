import React from 'react'
import { BiX } from "react-icons/bi"
import "../../../styles/UserProfile.css"
const EditInfo = ({showEdit, setShowEdit}) => {
  return (
      <div className="userprofile-edit-wrapper">
          <div className={`userprofile-edit ${showEdit ? "on" : "off"}`}>
              <div className="userprofile-edit-cancel-wrapper">
                  <BiX className="userprofile-edit-cancel-icon" onClick={() => setShowEdit(!showEdit)} />
              </div>
              <div className="userprofile-edit-input">
                  <input className="userprofile-input"
                      placeholder="Full name"
                  // value={email}
                  // onChange={(e) => setEmail(e.target.value)}
                  />
                  <input className="userprofile-input"
                      placeholder="Phone number"
                  // value={email}
                  // onChange={(e) => setEmail(e.target.value)}
                  />
                  <input className="userprofile-input"
                      placeholder="Email"
                  // value={email}
                  // onChange={(e) => setEmail(e.target.value)}
                  />
                  <input className="userprofile-input"
                      placeholder="Address"
                  // value={email}
                  // onChange={(e) => setEmail(e.target.value)}
                  />
                  <button className="userprofile-detail1-main-button" onClick={() => setShowEdit(!showEdit)}>Confirm</button>
              </div>
          </div>
      </div>
  )
}

export default EditInfo