import React, { useState } from 'react'
import { SlArrowRight, SlArrowDown } from "react-icons/sl";

const Dropdown = ({question, answer}) => {
    const [show, setShow] = useState(false)
  return (
        <div className="FAQ-question-answer" onClick={() => setShow(!show)}>
            <div className="FAQ-question" >  
              <SlArrowRight
                  className={`FAQ-question-icon ${show ? "rotate" : ""}`}
              />
                <strong>{question}</strong>
            </div>
            {show && (
            <div className="FAQ-answer">
                {answer}
            </div>
            )}
            
        </div>
  )
}

export default Dropdown