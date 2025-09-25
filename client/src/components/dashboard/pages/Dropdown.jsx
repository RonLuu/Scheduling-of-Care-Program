import React, { useState } from 'react'
import { SlArrowRight, SlArrowDown } from "react-icons/sl";

const Dropdown = ({question, answer}) => {
    const [show, setShow] = useState(false)
  return (
        <>
            <div className="FAQ-question">
                {show ? (<SlArrowRight />):(<SlArrowDown/>)}
                How do I log out?
            </div>
            
            <div className="FAQ-answer">
                {show ? (<SlArrowRight />):(<SlArrowDown/>)}
                How do I log out?
            </div>
        </>
  )
}

export default Dropdown